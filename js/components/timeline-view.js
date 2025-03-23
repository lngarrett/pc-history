/**
 * Timeline View Component for PC History Tracker
 */

// Create TimelineView namespace
window.TimelineView = (function() {
  // Private variables
  let currentPartId = null;
  
  return {
    /**
     * Initialize the timeline view component
     */
    init: function() {
      // Back button event
      document.getElementById('back-to-parts').addEventListener('click', () => {
        this.hide();
      });
    },
    
    /**
     * Show the timeline view for a part
     * @param {number} partId - Part ID
     */
    showPartTimeline: async function(partId) {
      if (!partId) return;
      
      try {
        console.log('Showing timeline for part ID:', partId);
        currentPartId = partId;
        
        // Get the part details
        const part = window.PartModel.getPartById(partId);
        
        if (!part) {
          throw new Error('Part not found');
        }
        
        const partName = `${part.brand} ${part.model} (${part.type})`;
        const partType = part.type;
        const isDeleted = part.is_deleted === 1;
        const isConnected = part.active_connections > 0;
        
        console.log('Part name for timeline:', partName);
        
        // Update the timeline title
        document.getElementById('timeline-part-name').textContent = partName;
        
        // Remove any existing action buttons
        const existingActions = document.querySelector('#part-timeline-view .actions');
        if (existingActions) {
          existingActions.remove();
        }
        
        // Clear the timeline
        const timelineContainer = document.getElementById('part-timeline');
        DOMUtils.clearElement(timelineContainer);
        
        // Get timeline events - placeholder until TimelineEvent model is implemented
        const timelineEvents = window.TimelineEvent ? window.TimelineEvent.getTimelineEventsForPart(partId) : [];
        
        // Render timeline
        if (timelineEvents.length === 0) {
          // Display a message if no events
          const emptyMessage = DOMUtils.createElement('div', { className: 'empty-timeline' },
            'No events found for this part. Try adding an acquisition date, connecting it to a motherboard, or recording its disposal.');
          timelineContainer.appendChild(emptyMessage);
        } else {
          // Render timeline events
          timelineEvents.forEach(event => this.renderTimelineEvent(timelineContainer, event));
        }
        
        // Add part action buttons
        const partActionsContainer = DOMUtils.createElement('div', { className: 'actions' });
        
        // Only add connect/disconnect and dispose buttons if not a motherboard and not deleted
        if (partType !== 'motherboard' && !isDeleted) {
          // Connect/Disconnect button
          const connectBtn = DOMUtils.createButton(
            isConnected ? 'Disconnect' : 'Connect',
            isConnected ? 'disconnect-btn' : 'connect-btn',
            () => {
              if (isConnected) {
                if (window.ConnectionController && typeof window.ConnectionController.showDisconnectOptions === 'function') {
                  window.ConnectionController.showDisconnectOptions(partId);
                }
              } else {
                if (window.ConnectionController && typeof window.ConnectionController.showConnectOptions === 'function') {
                  window.ConnectionController.showConnectOptions(partId);
                }
              }
            }
          );
          partActionsContainer.appendChild(connectBtn);
          
          // Dispose button
          const disposeBtn = DOMUtils.createButton('Dispose', 'delete-btn', () => {
            if (window.DisposalController && typeof window.DisposalController.showDisposePartForm === 'function') {
              window.DisposalController.showDisposePartForm(partId);
            }
          });
          partActionsContainer.appendChild(disposeBtn);
        }
        
        // Admin Delete button - always available
        const adminDeleteBtn = DOMUtils.createButton('Delete from History', 'admin-button', 
          () => DOMUtils.showConfirmDialog(
            'Are you sure you want to permanently delete this part? This will remove it and all its history from the database.',
            () => {
              if (window.PartModel && typeof window.PartModel.hardDeletePart === 'function') {
                window.PartModel.hardDeletePart(partId);
                this.hide();
                if (window.PartsList && typeof window.PartsList.refresh === 'function') {
                  window.PartsList.refresh();
                }
              }
            }
          )
        );
        partActionsContainer.appendChild(adminDeleteBtn);
        
        // Insert the action buttons after the back button and before the timeline
        const backButton = document.getElementById('back-to-parts');
        backButton.parentNode.insertBefore(partActionsContainer, backButton.nextSibling);
        
        // Show the timeline view
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('part-timeline-view').classList.remove('hidden');
        
        console.log('Timeline view activated with', timelineEvents.length, 'events');
      } catch (err) {
        console.error('Error showing timeline:', err);
        alert('Error showing timeline: ' + err.message);
      }
    },
    
    /**
     * Hide the timeline view
     */
    hide: function() {
      document.getElementById('part-timeline-view').classList.add('hidden');
      document.getElementById('app-container').classList.remove('hidden');
      currentPartId = null;
    },
    
    /**
     * Render a timeline event
     * @param {HTMLElement} container - Container element
     * @param {Object} event - Timeline event
     */
    renderTimelineEvent: function(container, event) {
      // No implementation yet as we need the TimelineEvent model first
      // This is a placeholder to show how it would be implemented
      
      const item = DOMUtils.createElement('div', { className: `timeline-item ${event.type}` });
      
      // Date element
      const dateElement = DOMUtils.createElement('div', { className: 'timeline-date' },
        event.date ? DateUtils.formatDateByPrecision(event.date, event.precision) : 'Unknown Date');
      
      // Content element
      const content = DOMUtils.createElement('div', { className: 'timeline-content' });
      
      // Title
      const title = DOMUtils.createElement('h3', {}, event.title);
      
      // Description
      const description = DOMUtils.createElement('p', {}, event.content);
      
      content.appendChild(title);
      content.appendChild(description);
      
      // Notes
      if (event.notes) {
        const notes = DOMUtils.createElement('p', {}, [
          DOMUtils.createElement('strong', {}, 'Notes: '),
          event.notes
        ]);
        content.appendChild(notes);
      }
      
      // Only add delete event button for connected, disconnected, and disposed events (not for acquisition)
      if (event.type !== 'acquisition') {
        // Add admin action to delete this event
        const adminActions = DOMUtils.createElement('div', { className: 'timeline-admin-actions' });
        
        const deleteEventBtn = DOMUtils.createButton('Delete Event', 'admin-button small-btn', 
          () => DOMUtils.showConfirmDialog(
            'Are you sure you want to delete this event from history? This cannot be undone.',
            async () => {
              try {
                // Delete the event
                if (window.TimelineEvent && typeof window.TimelineEvent.deleteTimelineEvent === 'function') {
                  window.TimelineEvent.deleteTimelineEvent(currentPartId, event.type, event.date);
                  
                  // Refresh the timeline
                  this.showPartTimeline(currentPartId);
                  
                  // Also refresh the part list
                  if (window.PartsList && typeof window.PartsList.refresh === 'function') {
                    window.PartsList.refresh();
                  }
                }
              } catch (err) {
                console.error('Error deleting event:', err);
                alert('Error deleting event: ' + err.message);
              }
            }
          )
        );
        
        adminActions.appendChild(deleteEventBtn);
        content.appendChild(adminActions);
      }
      
      item.appendChild(dateElement);
      item.appendChild(content);
      container.appendChild(item);
    }
  };
})();