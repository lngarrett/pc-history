/**
 * Rig model for PC History Tracker
 * Manages rigs (motherboards with connected parts)
 */

// Create namespace
window.RigModel = (function() {
  // Private members
  
  /**
   * Get all active rigs
   * @returns {Array} Array of rig objects with a has_been_rig flag
   */
  function getActiveRigs() {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      console.log('Getting active rigs from database...');
      
      // Query for motherboards with connection history information
      const query = `
        SELECT 
          p.id,
          p.brand,
          p.model,
          (SELECT COUNT(*) FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL) as connected_parts,
          (SELECT name FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as rig_name,
          (SELECT active_from FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from,
          (SELECT active_from_precision FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from_precision,
          -- Check if this motherboard has ever had connections (making it a rig at some point)
          EXISTS (SELECT 1 FROM connections c WHERE c.motherboard_id = p.id) as has_been_rig
        FROM parts p
        WHERE p.type = 'motherboard' AND p.is_deleted = 0
        ORDER BY connected_parts DESC, rig_name, p.brand, p.model
      `;
      
      const result = db.exec(query);
      
      if (result.length === 0) {
        console.log('No motherboards found in the database');
        return [];
      }
      
      // Map column names to values
      const columns = result[0].columns;
      const rigs = result[0].values.map(row => {
        const rig = {};
        columns.forEach((column, index) => {
          rig[column] = row[index];
        });
        return rig;
      });
      
      console.log(`Found ${rigs.length} motherboards, with ${rigs.filter(r => r.connected_parts > 0).length} active rigs`);
      return rigs;
    } catch (err) {
      console.error('Error getting active rigs:', err);
      throw err;
    }
  }

  /**
   * Get all historical rigs
   * @returns {Array} Array of historical rig objects
   */
  function getHistoricalRigs() {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      console.log('Getting historical rigs from database...');
      
      // A historical rig is one where a motherboard had parts connected but now has zero
      // This improved query considers each period where a motherboard had >0 parts as a separate "rig"
      const query = `
        WITH rig_periods AS (
          -- Find all periods where a motherboard had connected parts
          SELECT 
            c.motherboard_id,
            MIN(c.connected_at) as rig_start_date,
            MIN(c.connected_precision) as rig_start_precision,
            CASE 
              -- If there are still connected parts, this rig is still active
              WHEN EXISTS (
                SELECT 1 FROM connections 
                WHERE motherboard_id = c.motherboard_id AND disconnected_at IS NULL
              ) THEN NULL
              -- Otherwise, it ended at the date of the last disconnection
              ELSE MAX(c.disconnected_at) 
            END as rig_end_date,
            MAX(c.disconnected_precision) as rig_end_precision,
            COUNT(*) as total_connections,
            -- Count active connections (should be 0 for historical rigs)
            SUM(CASE WHEN c.disconnected_at IS NULL THEN 1 ELSE 0 END) as active_connections
          FROM connections c
          GROUP BY c.motherboard_id
          -- Only include completed rig periods (no active connections)
          HAVING active_connections = 0 AND total_connections > 0
        ),
        rig_identity_matches AS (
          -- Find the appropriate rig identity for each historical period
          SELECT 
            rp.motherboard_id,
            rp.rig_start_date,
            rp.rig_start_precision,
            rp.rig_end_date,
            rp.rig_end_precision,
            ri.name as rig_name,
            ri.id as rig_identity_id,
            ri.active_from,
            ri.active_from_precision,
            ri.active_until,
            ri.active_until_precision
          FROM rig_periods rp
          LEFT JOIN rig_identities ri ON ri.motherboard_id = rp.motherboard_id
            -- Match rig identities that overlap with this rig period
            AND (
              (ri.active_from <= rp.rig_end_date) AND
              (ri.active_until IS NULL OR ri.active_until >= rp.rig_start_date)
            )
          -- Only include inactive rigs
          WHERE rp.rig_end_date IS NOT NULL
        ),
        -- Also look up names from the newer rig_names table
        rig_names_lookup AS (
          SELECT
            rn.motherboard_id,
            rn.start_date,
            rn.name AS name_from_rig_names
          FROM rig_names rn
        )
        SELECT 
          p.id,
          p.brand,
          p.model,
          p.acquisition_date,
          p.date_precision,
          rim.rig_name,
          rim.rig_identity_id,
          rim.rig_start_date,
          rim.rig_start_precision,
          rim.rig_end_date,
          rim.rig_end_precision,
          -- Try to get the name from rig_names table as well
          (SELECT name_from_rig_names FROM rig_names_lookup 
           WHERE motherboard_id = p.id AND start_date = rim.rig_start_date LIMIT 1) AS rig_name_from_lookup,
          -- Look up the total number of parts that were in this rig
          (
            SELECT COUNT(DISTINCT part_id) 
            FROM connections 
            WHERE motherboard_id = p.id
              AND connected_at <= rim.rig_end_date
              AND (disconnected_at IS NULL OR disconnected_at >= rim.rig_start_date)
          ) as total_parts
        FROM parts p
        JOIN rig_identity_matches rim ON p.id = rim.motherboard_id
        WHERE p.type = 'motherboard' AND p.is_deleted = 0
        ORDER BY rim.rig_end_date DESC
      `;
      
      const result = db.exec(query);
      
      if (result.length === 0) {
        console.log('No historical rigs found in the database');
        return [];
      }
      
      // Map column names to values
      const columns = result[0].columns;
      const historicalRigs = result[0].values.map(row => {
        const rig = {};
        columns.forEach((column, index) => {
          rig[column] = row[index];
        });
        return rig;
      });
      
      console.log(`Found ${historicalRigs.length} historical rigs`);
      return historicalRigs;
    } catch (err) {
      console.error('Error getting historical rigs:', err);
      throw err;
    }
  }

  /**
   * Get a rig's details including connected parts
   * @param {number} motherboardId - Motherboard ID
   * @returns {Object} Rig details with connected parts
   */
  function getRigDetails(motherboardId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Get motherboard details
      const query = `
        SELECT 
          p.id,
          p.brand,
          p.model,
          p.acquisition_date,
          p.date_precision,
          p.notes,
          (SELECT name FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as rig_name,
          (SELECT active_from FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from,
          (SELECT active_from_precision FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from_precision
        FROM parts p
        WHERE p.id = ${motherboardId} AND p.type = 'motherboard'
      `;
      
      const result = db.exec(query);
      if (result.length === 0 || result[0].values.length === 0) {
        throw new Error(`Motherboard with ID ${motherboardId} not found`);
      }
      
      // Map column names to values
      const columns = result[0].columns;
      const row = result[0].values[0];
      
      const rig = {};
      columns.forEach((column, index) => {
        rig[column] = row[index];
      });
      
      // Get connected parts
      rig.connected_parts = window.ConnectionModel.getActiveConnectionsForMotherboard(motherboardId);
      
      return rig;
    } catch (err) {
      console.error(`Error getting rig details for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }

  /**
   * Set or update a rig identity
   * @param {number} motherboardId - Motherboard ID
   * @param {string} name - Rig name
   * @param {Object} dateInfo - Active from date information
   * @returns {number} Rig identity ID
   */
  function setRigIdentity(motherboardId, name, dateInfo) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    const { year, month, day } = dateInfo;
    
    // Validate parameters
    if (!motherboardId) {
      throw new Error('Motherboard ID is required');
    }
    
    if (!name) {
      throw new Error('Rig name is required');
    }
    
    if (!year) {
      throw new Error('Active from year is required');
    }
    
    try {
      // Begin transaction
      db.run('BEGIN TRANSACTION');
      
      // End any active rig identities for this motherboard
      db.run(`
        UPDATE rig_identities
        SET active_until = '${window.DateUtils.createDateString(year, month, day)}',
            active_until_precision = '${window.DateUtils.getDatePrecision(year, month, day)}'
        WHERE motherboard_id = ${motherboardId} AND active_until IS NULL
      `);
      
      // Create the active from date
      const activeFrom = window.DateUtils.createDateString(year, month, day);
      const precision = window.DateUtils.getDatePrecision(year, month, day);
      
      // Insert the new rig identity
      const query = `
        INSERT INTO rig_identities (motherboard_id, name, active_from, active_from_precision)
        VALUES (?, ?, ?, ?)
      `;
      
      const params = [
        motherboardId,
        name,
        activeFrom,
        precision
      ];
      
      db.run(query, params);
      
      // Commit transaction
      db.run('COMMIT');
      
      // Get the last inserted ID
      const result = db.exec('SELECT last_insert_rowid()');
      return result[0].values[0][0];
    } catch (err) {
      // Rollback transaction on error
      db.run('ROLLBACK');
      console.error(`Error setting rig identity for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }

  /**
   * Get all rig identities for a motherboard
   * @param {number} motherboardId - Motherboard ID
   * @returns {Array} Array of rig identity objects
   */
  function getRigIdentities(motherboardId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      const query = `
        SELECT 
          id,
          motherboard_id,
          name,
          active_from,
          active_from_precision,
          active_until,
          active_until_precision,
          notes
        FROM rig_identities
        WHERE motherboard_id = ${motherboardId}
        ORDER BY active_from DESC
      `;
      
      const result = db.exec(query);
      if (result.length === 0) return [];
      
      // Map column names to values
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const identity = {};
        columns.forEach((column, index) => {
          identity[column] = row[index];
        });
        return identity;
      });
    } catch (err) {
      console.error(`Error getting rig identities for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }

  /**
   * Get the current rig identity for a motherboard
   * @param {number} motherboardId - Motherboard ID
   * @returns {Object|null} Current rig identity or null if none
   */
  function getCurrentRigIdentity(motherboardId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      const query = `
        SELECT 
          id,
          motherboard_id,
          name,
          active_from,
          active_from_precision,
          notes
        FROM rig_identities
        WHERE motherboard_id = ${motherboardId} AND active_until IS NULL
        ORDER BY active_from DESC
        LIMIT 1
      `;
      
      const result = db.exec(query);
      if (result.length === 0 || result[0].values.length === 0) {
        return null;
      }
      
      // Map column names to values
      const columns = result[0].columns;
      const row = result[0].values[0];
      
      const identity = {};
      columns.forEach((column, index) => {
        identity[column] = row[index];
      });
      
      return identity;
    } catch (err) {
      console.error(`Error getting current rig identity for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }

  /**
   * Get a rig by its identity ID
   * @param {number} rigIdentityId - Rig identity ID
   * @returns {Object|null} Rig object or null if not found
   */
  function getRigById(rigIdentityId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Get the rig identity first
      const identityQuery = `
        SELECT 
          ri.id,
          ri.motherboard_id,
          ri.name,
          ri.active_from,
          ri.active_from_precision,
          ri.active_until,
          ri.active_until_precision,
          ri.notes
        FROM rig_identities ri
        WHERE ri.id = ${rigIdentityId}
      `;
      
      const identityResult = db.exec(identityQuery);
      if (identityResult.length === 0 || identityResult[0].values.length === 0) {
        return null;
      }
      
      // Map column names to values
      const identityColumns = identityResult[0].columns;
      const identityRow = identityResult[0].values[0];
      
      const rigIdentity = {};
      identityColumns.forEach((column, index) => {
        rigIdentity[column] = identityRow[index];
      });
      
      // Get the motherboard details
      const motherboardId = rigIdentity.motherboard_id;
      const motherboardQuery = `
        SELECT 
          id,
          brand,
          model,
          acquisition_date,
          date_precision,
          notes
        FROM parts
        WHERE id = ${motherboardId}
      `;
      
      const motherboardResult = db.exec(motherboardQuery);
      if (motherboardResult.length === 0 || motherboardResult[0].values.length === 0) {
        throw new Error(`Motherboard with ID ${motherboardId} not found`);
      }
      
      // Map motherboard data
      const motherboardColumns = motherboardResult[0].columns;
      const motherboardRow = motherboardResult[0].values[0];
      
      const motherboard = {};
      motherboardColumns.forEach((column, index) => {
        motherboard[column] = motherboardRow[index];
      });
      
      // Count connected parts if this is an active rig
      let connectedParts = 0;
      if (!rigIdentity.active_until) {
        const countQuery = `
          SELECT COUNT(*) as count
          FROM connections
          WHERE motherboard_id = ${motherboardId} AND disconnected_at IS NULL
        `;
        
        const countResult = db.exec(countQuery);
        if (countResult.length > 0 && countResult[0].values.length > 0) {
          connectedParts = countResult[0].values[0][0];
        }
      }
      
      // Combine data into a single rig object
      return {
        id: rigIdentity.id,
        motherboard_id: motherboard.id,
        brand: motherboard.brand,
        model: motherboard.model,
        rig_name: rigIdentity.name,
        active_from: rigIdentity.active_from,
        active_from_precision: rigIdentity.active_from_precision,
        active_until: rigIdentity.active_until,
        active_until_precision: rigIdentity.active_until_precision,
        connected_parts: connectedParts,
        notes: rigIdentity.notes
      };
    } catch (err) {
      console.error(`Error getting rig by identity ID ${rigIdentityId}:`, err);
      throw err;
    }
  }
  
  /**
   * Compute a rig's lifecycle periods from connections
   * @param {number} motherboardId - Motherboard ID
   * @returns {Array} Array of lifecycle objects with start/end dates and sequence numbers
   */
  function computeRigLifecycles(motherboardId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      console.log(`Computing rig lifecycles for motherboard ${motherboardId}`);
      
      if (!motherboardId) {
        console.warn('No motherboard ID provided to computeRigLifecycles');
        return [];
      }
      
      // Get all connections for this motherboard in chronological order
      const connectionsQuery = `
        SELECT 
          'connect' as event_type,
          connected_at as event_date,
          connected_precision as event_precision,
          part_id
        FROM connections 
        WHERE motherboard_id = ${motherboardId}
        UNION ALL
        SELECT 
          'disconnect' as event_type,
          disconnected_at as event_date,
          disconnected_precision as event_precision,
          part_id
        FROM connections 
        WHERE motherboard_id = ${motherboardId} AND disconnected_at IS NOT NULL
        ORDER BY event_date
      `;
      
      const connectionsResult = db.exec(connectionsQuery);
      if (connectionsResult.length === 0) {
        console.log(`No connection events found for motherboard ${motherboardId}`);
        return [];
      }
      
      // Process events to identify lifecycle periods
      const events = [];
      const columns = connectionsResult[0].columns;
      
      connectionsResult[0].values.forEach(row => {
        const event = {};
        columns.forEach((column, index) => {
          event[column] = row[index];
        });
        events.push(event);
      });
      
      console.log(`Found ${events.length} connection events for motherboard ${motherboardId}`);
      
      // Compute lifecycles
      const lifecycles = [];
      let currentSequence = 0;
      let activeConnections = 0;
      let currentLifecycle = null;
      
      events.forEach(event => {
        if (event.event_type === 'connect') {
          activeConnections++;
          console.log(`Connect event for part ${event.part_id} at ${event.event_date}, active connections: ${activeConnections}`);
          
          // First connection to an empty motherboard starts a new lifecycle
          if (activeConnections === 1) {
            currentSequence++;
            currentLifecycle = {
              sequence: currentSequence,
              start_date: event.event_date,
              start_precision: event.event_precision,
              end_date: null,
              end_precision: null,
              active: true
            };
            lifecycles.push(currentLifecycle);
            console.log(`Started new lifecycle #${currentSequence} at ${event.event_date}`);
          }
        } else if (event.event_type === 'disconnect') {
          activeConnections = Math.max(0, activeConnections - 1);
          console.log(`Disconnect event for part ${event.part_id} at ${event.event_date}, active connections: ${activeConnections}`);
          
          // Last disconnection from a motherboard ends the current lifecycle
          if (activeConnections === 0 && currentLifecycle) {
            currentLifecycle.end_date = event.event_date;
            currentLifecycle.end_precision = event.event_precision;
            currentLifecycle.active = false;
            console.log(`Ended lifecycle #${currentLifecycle.sequence} at ${event.event_date}`);
          }
        }
      });
      
      console.log(`Computed ${lifecycles.length} lifecycles for motherboard ${motherboardId}`);
      console.log(`Active lifecycles: ${lifecycles.filter(cycle => cycle.active).length}`);
      
      return lifecycles;
    } catch (err) {
      console.error(`Error computing rig lifecycles for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }
  
  /**
   * Get or set a rig name for a specific lifecycle
   * @param {number} motherboardId - Motherboard ID
   * @param {string} startDate - Lifecycle start date
   * @param {string} name - Rig name
   * @param {string} notes - Optional notes
   * @returns {number} Rig name ID
   */
  function setRigName(motherboardId, startDate, name, notes = '') {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Ensure the rig_names table exists
      db.run(`
        CREATE TABLE IF NOT EXISTS rig_names (
          id INTEGER PRIMARY KEY,
          motherboard_id INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          name TEXT NOT NULL,
          notes TEXT,
          FOREIGN KEY (motherboard_id) REFERENCES parts(id) ON DELETE CASCADE
        )
      `);
      
      // Insert or replace the rig name
      const query = `
        INSERT OR REPLACE INTO rig_names (motherboard_id, start_date, name, notes)
        VALUES (?, ?, ?, ?)
      `;
      
      const params = [motherboardId, startDate, name, notes];
      db.run(query, params);
      
      // Get the ID of the inserted/updated record
      const result = db.exec('SELECT last_insert_rowid()');
      return result[0].values[0][0];
    } catch (err) {
      console.error(`Error setting rig name for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }
  
  /**
   * Get the name for a specific rig lifecycle
   * @param {number} motherboardId - Motherboard ID
   * @param {string} startDate - Lifecycle start date
   * @returns {Object|null} Rig name object or null if not found
   */
  function getRigName(motherboardId, startDate) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      console.log(`Looking up rig name for motherboard ${motherboardId} with start date ${startDate}`);
      
      if (!motherboardId) {
        console.warn('No motherboard ID provided to getRigName');
        return null;
      }
      
      if (!startDate) {
        console.warn('No start date provided to getRigName');
        return null;
      }
      
      // First ensure the table exists (in case database was created before this feature)
      db.run(`
        CREATE TABLE IF NOT EXISTS rig_names (
          id INTEGER PRIMARY KEY,
          motherboard_id INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          name TEXT NOT NULL,
          notes TEXT,
          FOREIGN KEY (motherboard_id) REFERENCES parts(id) ON DELETE CASCADE
        )
      `);
      
      const query = `
        SELECT id, motherboard_id, start_date, name, notes
        FROM rig_names
        WHERE motherboard_id = ? AND start_date = ?
      `;
      
      const result = db.exec(query, [motherboardId, startDate]);
      if (result.length === 0 || result[0].values.length === 0) {
        console.log(`No rig name found for motherboard ${motherboardId} with start date ${startDate}`);
        return null;
      }
      
      // Map columns to values
      const columns = result[0].columns;
      const row = result[0].values[0];
      
      const rigName = {};
      columns.forEach((column, index) => {
        rigName[column] = row[index];
      });
      
      console.log(`Found rig name for motherboard ${motherboardId}: ${rigName.name}`);
      return rigName;
    } catch (err) {
      console.error(`Error getting rig name for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }
  
  /**
   * Delete all rig names for a motherboard
   * @param {number} motherboardId - Motherboard ID
   * @returns {boolean} Success
   */
  function deleteAllRigNames(motherboardId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Ensure table exists before attempting to delete
      db.run(`
        CREATE TABLE IF NOT EXISTS rig_names (
          id INTEGER PRIMARY KEY,
          motherboard_id INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          name TEXT NOT NULL,
          notes TEXT,
          FOREIGN KEY (motherboard_id) REFERENCES parts(id) ON DELETE CASCADE
        )
      `);
      
      db.run(`DELETE FROM rig_names WHERE motherboard_id = ?`, [motherboardId]);
      return true;
    } catch (err) {
      console.error(`Error deleting rig names for motherboard ${motherboardId}:`, err);
      throw err;
    }
  }

  // Public API
  return {
    getActiveRigs,
    getHistoricalRigs,
    getRigDetails,
    getRigById,
    setRigIdentity,
    getRigIdentities,
    getCurrentRigIdentity,
    // New API for rig names
    computeRigLifecycles,
    setRigName,
    getRigName,
    deleteAllRigNames
  };
})();