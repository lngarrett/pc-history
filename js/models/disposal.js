/**
 * Disposal model for PC History Tracker
 * Manages part disposals
 */

// Create namespace
window.DisposalModel = (function() {
  // Private members
  
  /**
   * Get disposal information for a part
   * @param {number} partId - Part ID
   * @returns {Object|null} Disposal information or null if not disposed
   */
  function getDisposalForPart(partId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      const query = `
        SELECT 
          id,
          part_id,
          disposed_at,
          disposed_precision,
          reason,
          notes
        FROM disposals
        WHERE part_id = ${partId}
        ORDER BY disposed_at DESC
        LIMIT 1
      `;
      
      const result = db.exec(query);
      if (result.length === 0 || result[0].values.length === 0) {
        return null;
      }
      
      // Map column names to values
      const columns = result[0].columns;
      const row = result[0].values[0];
      
      const disposal = {};
      columns.forEach((column, index) => {
        disposal[column] = row[index];
      });
      
      return disposal;
    } catch (err) {
      console.error(`Error getting disposal for part ${partId}:`, err);
      throw err;
    }
  }

  /**
   * Dispose of a part
   * @param {number} partId - Part ID
   * @param {Object} dateInfo - Disposal date information
   * @param {string} reason - Disposal reason
   * @param {string} notes - Disposal notes
   * @returns {number} New disposal ID
   */
  function disposePart(partId, dateInfo, reason, notes = '') {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    const { year, month, day } = dateInfo;
    
    // Validate parameters
    if (!partId) {
      throw new Error('Part ID is required');
    }
    
    if (!year) {
      throw new Error('Disposal year is required');
    }
    
    try {
      // Begin transaction
      db.run('BEGIN TRANSACTION');
      
      // First disconnect all active connections for this part
      db.run(`
        UPDATE connections
        SET disconnected_at = '${window.DateUtils.createDateString(year, month, day)}',
            disconnected_precision = '${window.DateUtils.getDatePrecision(year, month, day)}'
        WHERE (part_id = ${partId} OR motherboard_id = ${partId})
          AND disconnected_at IS NULL
      `);
      
      // Create the disposal date
      const disposedAt = window.DateUtils.createDateString(year, month, day);
      const precision = window.DateUtils.getDatePrecision(year, month, day);
      
      // Insert the disposal record
      const query = `
        INSERT INTO disposals (part_id, disposed_at, disposed_precision, reason, notes)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [
        partId,
        disposedAt,
        precision,
        reason || 'Disposed',
        notes || ''
      ];
      
      db.run(query, params);
      
      // Mark the part as deleted
      db.run(`UPDATE parts SET is_deleted = 1 WHERE id = ${partId}`);
      
      // Commit transaction
      db.run('COMMIT');
      
      // Get the last inserted ID
      const result = db.exec('SELECT last_insert_rowid()');
      return result[0].values[0][0];
    } catch (err) {
      // Rollback transaction on error
      db.run('ROLLBACK');
      console.error(`Error disposing part ${partId}:`, err);
      throw err;
    }
  }

  /**
   * Restore a disposed part
   * @param {number} partId - Part ID
   */
  function restoreDisposedPart(partId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Begin transaction
      db.run('BEGIN TRANSACTION');
      
      // Delete disposal records
      db.run(`DELETE FROM disposals WHERE part_id = ${partId}`);
      
      // Mark the part as not deleted
      db.run(`UPDATE parts SET is_deleted = 0 WHERE id = ${partId}`);
      
      // Commit transaction
      db.run('COMMIT');
    } catch (err) {
      // Rollback transaction on error
      db.run('ROLLBACK');
      console.error(`Error restoring disposed part ${partId}:`, err);
      throw err;
    }
  }

  /**
   * Delete a disposal record
   * @param {number} disposalId - Disposal ID
   */
  function deleteDisposal(disposalId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Begin transaction
      db.run('BEGIN TRANSACTION');
      
      // Get the part ID
      const query = `SELECT part_id FROM disposals WHERE id = ${disposalId}`;
      const result = db.exec(query);
      
      if (result.length === 0 || result[0].values.length === 0) {
        throw new Error(`Disposal with ID ${disposalId} not found`);
      }
      
      const partId = result[0].values[0][0];
      
      // Delete the disposal record
      db.run(`DELETE FROM disposals WHERE id = ${disposalId}`);
      
      // Check if there are other disposal records for this part
      const checkQuery = `SELECT COUNT(*) FROM disposals WHERE part_id = ${partId}`;
      const checkResult = db.exec(checkQuery);
      
      const disposalCount = checkResult[0].values[0][0];
      
      // If no other disposal records, mark part as not deleted
      if (disposalCount === 0) {
        db.run(`UPDATE parts SET is_deleted = 0 WHERE id = ${partId}`);
      }
      
      // Commit transaction
      db.run('COMMIT');
    } catch (err) {
      // Rollback transaction on error
      db.run('ROLLBACK');
      console.error(`Error deleting disposal ${disposalId}:`, err);
      throw err;
    }
  }

  // Public API
  return {
    getDisposalForPart,
    disposePart,
    restoreDisposedPart,
    deleteDisposal
  };
})();