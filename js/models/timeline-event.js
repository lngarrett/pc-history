/**
 * Timeline Event model for PC History Tracker
 * Manages part timeline events
 */

// Create namespace
window.TimelineEvent = (function() {
  // Private members
  
  /**
   * Event types
   */
  const EVENT_TYPES = {
    ACQUISITION: 'acquisition',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    DISPOSED: 'disposed'
  };

  /**
   * Get all timeline events for a part
   * @param {number} partId - Part ID
   * @returns {Array} Array of timeline events
   */
  function getTimelineEventsForPart(partId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Get part details
      const part = window.PartModel.getPartById(partId);
      
      if (!part) {
        throw new Error(`Part with ID ${partId} not found`);
      }
      
      // Create timeline array to hold all events
      const timelineEvents = [];
      
      // Add acquisition event if there's a date
      if (part.acquisition_date) {
        timelineEvents.push({
          date: part.acquisition_date,
          precision: part.date_precision || 'none',
          type: EVENT_TYPES.ACQUISITION,
          title: 'Part Acquired',
          content: `The ${part.brand} ${part.model} was acquired.`,
          notes: ''
        });
      }
      
      // Get all connections
      const connections = window.ConnectionModel.getConnectionsForPart(partId);
      
      // Add connection events
      connections.forEach(conn => {
        const connectedAt = conn.connected_at;
        const connectedPrecision = conn.connected_precision || 'day';
        const disconnectedAt = conn.disconnected_at;
        const disconnectedPrecision = conn.disconnected_precision || 'day';
        const notes = conn.notes || '';
        const motherboardBrand = conn.motherboard_brand;
        const motherboardModel = conn.motherboard_model;
        const rigName = conn.rig_name || '';
        
        // Add connected event
        const rigText = rigName ? ` (Part of "${rigName}" rig)` : '';
        timelineEvents.push({
          id: conn.id,
          date: connectedAt,
          precision: connectedPrecision,
          type: EVENT_TYPES.CONNECTED,
          title: 'Connected to Motherboard',
          content: `Connected to ${motherboardBrand} ${motherboardModel}${rigText}`,
          notes: notes
        });
        
        // Add disconnected event if applicable
        if (disconnectedAt) {
          timelineEvents.push({
            id: conn.id,
            date: disconnectedAt,
            precision: disconnectedPrecision,
            type: EVENT_TYPES.DISCONNECTED,
            title: 'Disconnected from Motherboard',
            content: `Disconnected from ${motherboardBrand} ${motherboardModel}${rigText}`,
            notes: notes
          });
        }
      });
      
      // Get disposal event if applicable
      const disposal = window.DisposalModel.getDisposalForPart(partId);
      
      // Add disposal event if found
      if (disposal) {
        timelineEvents.push({
          id: disposal.id,
          date: disposal.disposed_at,
          precision: disposal.disposed_precision || 'day',
          type: EVENT_TYPES.DISPOSED,
          title: 'Part Disposed',
          content: `The part was disposed: ${disposal.reason}`,
          notes: disposal.notes || ''
        });
      }
      
      // Sort by date (using lexicographical sorting since our dates are ISO format)
      timelineEvents.sort((a, b) => {
        // If no dates, put at beginning
        if (!a.date) return -1;
        if (!b.date) return 1;
        return a.date.localeCompare(b.date);
      });
      
      return timelineEvents;
    } catch (err) {
      console.error(`Error getting timeline events for part ${partId}:`, err);
      throw err;
    }
  }

  /**
   * Delete a timeline event
   * @param {number} partId - Part ID
   * @param {string} eventType - Event type
   * @param {string} eventDate - Event date
   */
  function deleteTimelineEvent(partId, eventType, eventDate) {
    const db = window.DatabaseService.getDatabase();
    if (!db) throw new Error('No database is open');
    
    try {
      // Different handling based on event type
      switch(eventType) {
        case EVENT_TYPES.ACQUISITION:
          // Clear acquisition date
          db.run(`UPDATE parts SET acquisition_date = NULL, date_precision = 'none' WHERE id = ${partId}`);
          break;
          
        case EVENT_TYPES.CONNECTED:
          // Delete specific connection by finding the matching record
          db.run(`
            DELETE FROM connections 
            WHERE part_id = ${partId} 
            AND connected_at = '${eventDate}'
            AND disconnected_at IS NULL
          `);
          break;
          
        case EVENT_TYPES.DISCONNECTED:
          // Find the connection and clear its disconnected date
          db.run(`
            UPDATE connections 
            SET disconnected_at = NULL, disconnected_precision = NULL
            WHERE part_id = ${partId} 
            AND disconnected_at = '${eventDate}'
          `);
          break;
          
        case EVENT_TYPES.DISPOSED:
          // Delete disposal record and un-delete the part
          db.run(`DELETE FROM disposals WHERE part_id = ${partId} AND disposed_at = '${eventDate}'`);
          db.run(`UPDATE parts SET is_deleted = 0 WHERE id = ${partId}`);
          break;
          
        default:
          throw new Error(`Unknown event type: ${eventType}`);
      }
    } catch (err) {
      console.error(`Error deleting timeline event for part ${partId}:`, err);
      throw err;
    }
  }

  // Public API
  return {
    EVENT_TYPES,
    getTimelineEventsForPart,
    deleteTimelineEvent
  };
})();