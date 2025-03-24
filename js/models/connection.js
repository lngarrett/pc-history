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
     * @param {Object} dateInfo - Connection date information (if not provided or missing year, will use part acquisition date)
     * @param {string} notes - Connection notes
     * @param {boolean} keepExistingParts - If true, existing parts of the same type will not be disconnected
     * @returns {number} New connection ID
     */
    connectPart: function(partId, motherboardId, dateInfo, notes = '', keepExistingParts = false) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      // Extract date info if provided
      let { year, month, day } = dateInfo || {};
      
      // Validate parameters
      if (!partId || !motherboardId) {
        throw new Error('Part ID and motherboard ID are required');
      }
      
      try {
        // Check if part is already connected
        const activeConnections = this.getActiveConnectionsForPart(partId);
        if (activeConnections.length > 0) {
          throw new Error('Part is already connected to a motherboard');
        }
        
        // Check that this part isn't a motherboard
        const partTypeQuery = `SELECT type FROM parts WHERE id = ${partId}`;
        const partTypeResult = db.exec(partTypeQuery);
        
        if (partTypeResult.length > 0 && partTypeResult[0].values.length > 0) {
          const partType = partTypeResult[0].values[0][0];
          if (partType === 'motherboard') {
            throw new Error('Cannot connect a motherboard to another motherboard');
          }
        } else {
          throw new Error('Part not found');
        }
        
        // If no year provided, try to use the part's acquisition date
        if (!year) {
          // Get the part's acquisition date
          const partQuery = `SELECT acquisition_date, date_precision FROM parts WHERE id = ${partId}`;
          const partResult = db.exec(partQuery);
          
          if (partResult.length > 0 && partResult[0].values.length > 0) {
            const acquisitionDate = partResult[0].values[0][0];
            const acquisitionPrecision = partResult[0].values[0][1];
            
            if (acquisitionDate) {
              console.log(`Using acquisition date ${acquisitionDate} for connection`);
              
              // Parse the acquisition date
              const dateParts = acquisitionDate.split('-');
              year = parseInt(dateParts[0]);
              
              // Only use month and day if we have the right precision
              if (dateParts.length > 1 && acquisitionPrecision !== 'year') {
                month = parseInt(dateParts[1]);
              }
              
              if (dateParts.length > 2 && acquisitionPrecision === 'day') {
                day = parseInt(dateParts[2]);
              }
            } else {
              throw new Error('Connection year is required (no acquisition date found)');
            }
          } else {
            throw new Error('Connection year is required (part not found)');
          }
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
        
        // Begin a transaction to ensure all operations are atomic
        db.run('BEGIN TRANSACTION');
        
        try {
          // If we need to disconnect existing parts of the same type
          if (!keepExistingParts) {
            // Get the part type
            const partTypeQuery = `SELECT type FROM parts WHERE id = ${partId}`;
            const partTypeResult = db.exec(partTypeQuery);
            
            if (partTypeResult.length > 0 && partTypeResult[0].values.length > 0) {
              const partType = partTypeResult[0].values[0][0];
              
              // Find active connections of the same type
              const sameTypeQuery = `
                SELECT c.id 
                FROM connections c
                JOIN parts p ON c.part_id = p.id
                WHERE c.motherboard_id = ${motherboardId}
                AND p.type = '${partType}'
                AND c.disconnected_at IS NULL
                AND c.part_id != ${partId}
              `;
              
              const sameTypeResult = db.exec(sameTypeQuery);
              
              // Disconnect existing parts of the same type
              if (sameTypeResult.length > 0 && sameTypeResult[0].values.length > 0) {
                for (const row of sameTypeResult[0].values) {
                  const connectionId = row[0];
                  
                  // Update the connection to disconnect it on the connection date
                  const disconnectQuery = `
                    UPDATE connections
                    SET disconnected_at = ?,
                        disconnected_precision = ?,
                        notes = CASE WHEN notes IS NULL OR notes = '' THEN ? ELSE notes || '\n' || ? END
                    WHERE id = ?
                  `;
                  
                  const disconnectNotes = 'Automatically disconnected due to new part connection';
                  
                  db.run(disconnectQuery, [
                    connectedAt,
                    precision,
                    disconnectNotes,
                    disconnectNotes,
                    connectionId
                  ]);
                }
              }
            }
          }
          
          // Insert the new connection
          db.run(query, params);
          
          // Commit the transaction
          db.run('COMMIT');
          
          // Get the last inserted ID
          const result = db.exec('SELECT last_insert_rowid()');
          return result[0].values[0][0];
        } catch (err) {
          // Rollback on error
          db.run('ROLLBACK');
          throw err;
        }
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
        
        // Use a transaction to ensure all updates are atomic
        db.run('BEGIN TRANSACTION');
        
        try {
          // Disconnect each active connection
          activeConnections.forEach(connection => {
            this.disconnectPart(connection.id, dateInfo, notes);
          });
          
          // Commit the transaction
          db.run('COMMIT');
        } catch (transactionErr) {
          // Rollback on error
          console.error("Error in disconnect transaction, rolling back:", transactionErr);
          db.run('ROLLBACK');
          throw transactionErr;
        }
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