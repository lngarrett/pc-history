/**
 * Rig model for PC History Tracker
 * Manages rigs (motherboards with connected parts)
 */

// Create namespace
window.RigModel = (function() {
  // Private members
  
  /**
   * Get all active rigs
   * @returns {Array} Array of rig objects
   */
  function getActiveRigs() {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Query for active rigs (motherboards with connections)
      const query = `
        SELECT 
          p.id,
          p.brand,
          p.model,
          (SELECT COUNT(*) FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL) as connected_parts,
          (SELECT name FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as rig_name,
          (SELECT active_from FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from,
          (SELECT active_from_precision FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from_precision
        FROM parts p
        WHERE p.type = 'motherboard' AND p.is_deleted = 0
          AND EXISTS (SELECT 1 FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL)
        ORDER BY rig_name, p.brand, p.model
      `;
      
      const result = db.exec(query);
      if (result.length === 0) return [];
      
      // Map column names to values
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const rig = {};
        columns.forEach((column, index) => {
          rig[column] = row[index];
        });
        return rig;
      });
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
      // Only show true historical rigs - motherboards that had connections but now have none
      // and exclude those that are currently active
      const query = `
        WITH historical_motherboards AS (
          SELECT 
            c.motherboard_id,
            MAX(c.disconnected_at) as last_disconnection_date,
            MAX(c.disconnected_precision) as last_disconnection_precision
          FROM connections c
          GROUP BY c.motherboard_id
          HAVING COUNT(CASE WHEN c.disconnected_at IS NULL THEN 1 END) = 0
            AND COUNT(*) > 0
        ),
        active_motherboards AS (
          SELECT DISTINCT motherboard_id
          FROM connections
          WHERE disconnected_at IS NULL
        ),
        last_rig_for_mobo AS (
          SELECT 
            ri.motherboard_id,
            ri.name,
            ri.active_from,
            ri.active_from_precision,
            ri.active_until,
            ri.active_until_precision
          FROM rig_identities ri
          JOIN (
            SELECT motherboard_id, MAX(active_from) as max_active_from
            FROM rig_identities
            GROUP BY motherboard_id
          ) latest ON ri.motherboard_id = latest.motherboard_id AND ri.active_from = latest.max_active_from
        )
        SELECT
          p.id,
          p.brand,
          p.model,
          hm.last_disconnection_date,
          hm.last_disconnection_precision,
          lr.name as rig_name,
          lr.active_from,
          lr.active_from_precision,
          lr.active_until,
          lr.active_until_precision
        FROM historical_motherboards hm
        JOIN parts p ON hm.motherboard_id = p.id
        LEFT JOIN last_rig_for_mobo lr ON p.id = lr.motherboard_id
        WHERE p.is_deleted = 0
          AND NOT EXISTS (SELECT 1 FROM active_motherboards am WHERE am.motherboard_id = p.id)
        ORDER BY hm.last_disconnection_date DESC
      `;
      
      const result = db.exec(query);
      if (result.length === 0) return [];
      
      // Map column names to values
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const rig = {};
        columns.forEach((column, index) => {
          rig[column] = row[index];
        });
        return rig;
      });
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

  // Public API
  return {
    getActiveRigs,
    getHistoricalRigs,
    getRigDetails,
    setRigIdentity,
    getRigIdentities,
    getCurrentRigIdentity
  };
})();