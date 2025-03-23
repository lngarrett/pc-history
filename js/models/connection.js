/**
 * Connection model for PC History Tracker
 * Manages connections between parts and motherboards
 */

// Create ConnectionModel namespace
window.ConnectionModel = (function() {
  return {
    /**
     * Get all connections for a part
     * @param {number} partId - Part ID
     * @returns {Array} Array of connection objects
     */
    getConnectionsForPart: function(partId) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        const query = `
          SELECT 
            c.id,
            c.motherboard_id, 
            c.part_id,
            c.connected_at, 
            c.connected_precision,
            c.disconnected_at, 
            c.disconnected_precision,
            c.notes,
            p.brand as motherboard_brand, 
            p.model as motherboard_model,
            ri.name as rig_name
          FROM connections c
          JOIN parts p ON c.motherboard_id = p.id
          LEFT JOIN rig_identities ri ON ri.motherboard_id = p.id AND 
            (ri.active_from <= c.connected_at AND (ri.active_until IS NULL OR ri.active_until >= c.connected_at))
          WHERE c.part_id = ${partId}
          ORDER BY c.connected_at ASC
        `;
        
        const result = db.exec(query);
        if (result.length === 0) return [];
        
        // Map column names to values
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const connection = {};
          columns.forEach((column, index) => {
            connection[column] = row[index];
          });
          return connection;
        });
      } catch (err) {
        console.error(`Error getting connections for part ${partId}:`, err);
        throw err;
      }
    },
    
    /**
     * Get all connections for a motherboard
     * @param {number} motherboardId - Motherboard ID
     * @returns {Array} Array of connection objects
     */
    getConnectionsForMotherboard: function(motherboardId) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        const query = `
          SELECT 
            c.id,
            c.motherboard_id, 
            c.part_id,
            c.connected_at, 
            c.connected_precision,
            c.disconnected_at, 
            c.disconnected_precision,
            c.notes,
            p.brand as part_brand, 
            p.model as part_model,
            p.type as part_type
          FROM connections c
          JOIN parts p ON c.part_id = p.id
          WHERE c.motherboard_id = ${motherboardId}
          ORDER BY c.connected_at ASC, p.type
        `;
        
        const result = db.exec(query);
        if (result.length === 0) return [];
        
        // Map column names to values
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const connection = {};
          columns.forEach((column, index) => {
            connection[column] = row[index];
          });
          return connection;
        });
      } catch (err) {
        console.error(`Error getting connections for motherboard ${motherboardId}:`, err);
        throw err;
      }
    },
    
    /**
     * Get active connections for a part
     * @param {number} partId - Part ID
     * @returns {Array} Array of connection objects
     */
    getActiveConnectionsForPart: function(partId) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        const query = `
          SELECT 
            c.id,
            c.motherboard_id, 
            c.connected_at, 
            c.connected_precision,
            c.notes,
            p.brand as motherboard_brand, 
            p.model as motherboard_model,
            ri.name as rig_name
          FROM connections c
          JOIN parts p ON c.motherboard_id = p.id
          LEFT JOIN rig_identities ri ON ri.motherboard_id = p.id AND ri.active_until IS NULL
          WHERE c.part_id = ${partId} AND c.disconnected_at IS NULL
          ORDER BY c.connected_at DESC
        `;
        
        const result = db.exec(query);
        if (result.length === 0) return [];
        
        // Map column names to values
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const connection = {};
          columns.forEach((column, index) => {
            connection[column] = row[index];
          });
          return connection;
        });
      } catch (err) {
        console.error(`Error getting active connections for part ${partId}:`, err);
        throw err;
      }
    },
    
    /**
     * Get active connections for a motherboard
     * @param {number} motherboardId - Motherboard ID
     * @returns {Array} Array of connection objects
     */
    getActiveConnectionsForMotherboard: function(motherboardId) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        const query = `
          SELECT 
            c.id,
            c.part_id,
            c.connected_at, 
            c.connected_precision,
            c.notes,
            p.brand as part_brand, 
            p.model as part_model,
            p.type as part_type
          FROM connections c
          JOIN parts p ON c.part_id = p.id
          WHERE c.motherboard_id = ${motherboardId} AND c.disconnected_at IS NULL
          ORDER BY p.type, p.brand, p.model
        `;
        
        const result = db.exec(query);
        if (result.length === 0) return [];
        
        // Map column names to values
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const connection = {};
          columns.forEach((column, index) => {
            connection[column] = row[index];
          });
          return connection;
        });
      } catch (err) {
        console.error(`Error getting active connections for motherboard ${motherboardId}:`, err);
        throw err;
      }
    },
    
    /**
     * Connect a part to a motherboard
     * @param {number} partId - Part ID
     * @param {number} motherboardId - Motherboard ID
     * @param {Object} dateInfo - Connection date information
     * @param {string} notes - Connection notes
     * @returns {number} New connection ID
     */
    connectPart: function(partId, motherboardId, dateInfo, notes = '') {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      const { year, month, day } = dateInfo;
      
      // Validate parameters
      if (!partId || !motherboardId) {
        throw new Error('Part ID and motherboard ID are required');
      }
      
      if (!year) {
        throw new Error('Connection year is required');
      }
      
      try {
        // Check if part is already connected
        const activeConnections = this.getActiveConnectionsForPart(partId);
        if (activeConnections.length > 0) {
          throw new Error('Part is already connected to a motherboard');
        }
        
        // Create the connection date
        const connectedAt = DateUtils.createDateString(year, month, day);
        const precision = DateUtils.getDatePrecision(year, month, day);
        
        // Insert the connection
        const query = `
          INSERT INTO connections (part_id, motherboard_id, connected_at, connected_precision, notes)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        const params = [
          partId,
          motherboardId,
          connectedAt,
          precision,
          notes || ''
        ];
        
        db.run(query, params);
        
        // Get the last inserted ID
        const result = db.exec('SELECT last_insert_rowid()');
        return result[0].values[0][0];
      } catch (err) {
        console.error(`Error connecting part ${partId} to motherboard ${motherboardId}:`, err);
        throw err;
      }
    },
    
    /**
     * Disconnect a part from a motherboard
     * @param {number} connectionId - Connection ID
     * @param {Object} dateInfo - Disconnection date information
     * @param {string} notes - Disconnection notes
     */
    disconnectPart: function(connectionId, dateInfo, notes = '') {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      const { year, month, day } = dateInfo;
      
      // Validate parameters
      if (!connectionId) {
        throw new Error('Connection ID is required');
      }
      
      if (!year) {
        throw new Error('Disconnection year is required');
      }
      
      try {
        // Get the connection to update its notes
        const query = `SELECT notes FROM connections WHERE id = ${connectionId}`;
        const result = db.exec(query);
        
        if (result.length === 0 || result[0].values.length === 0) {
          throw new Error(`Connection with ID ${connectionId} not found`);
        }
        
        const existingNotes = result[0].values[0][0] || '';
        const updatedNotes = notes ? (existingNotes ? `${existingNotes}\n${notes}` : notes) : existingNotes;
        
        // Create the disconnection date
        const disconnectedAt = DateUtils.createDateString(year, month, day);
        const precision = DateUtils.getDatePrecision(year, month, day);
        
        // Update the connection
        const updateQuery = `
          UPDATE connections
          SET disconnected_at = ?,
              disconnected_precision = ?,
              notes = ?
          WHERE id = ?
        `;
        
        const params = [
          disconnectedAt,
          precision,
          updatedNotes,
          connectionId
        ];
        
        db.run(updateQuery, params);
      } catch (err) {
        console.error(`Error disconnecting connection ${connectionId}:`, err);
        throw err;
      }
    },
    
    /**
     * Disconnect a part by part ID (disconnects all active connections)
     * @param {number} partId - Part ID
     * @param {Object} dateInfo - Disconnection date information
     * @param {string} notes - Disconnection notes
     */
    disconnectPartById: function(partId, dateInfo, notes = '') {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        // Get active connections for the part
        const activeConnections = this.getActiveConnectionsForPart(partId);
        
        if (activeConnections.length === 0) {
          throw new Error(`Part with ID ${partId} is not connected to any motherboard`);
        }
        
        // Disconnect each active connection
        activeConnections.forEach(connection => {
          this.disconnectPart(connection.id, dateInfo, notes);
        });
      } catch (err) {
        console.error(`Error disconnecting part ${partId}:`, err);
        throw err;
      }
    },
    
    /**
     * Delete a connection
     * @param {number} connectionId - Connection ID
     */
    deleteConnection: function(connectionId) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        db.run(`DELETE FROM connections WHERE id = ${connectionId}`);
      } catch (err) {
        console.error(`Error deleting connection ${connectionId}:`, err);
        throw err;
      }
    }
  };
})();