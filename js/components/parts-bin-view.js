/**
 * Parts Bin View component for PC History Tracker
 * Handles rendering and actions for parts bin tab
 */

// Create namespace
window.PartsBinView = (function() {
  // Private members
  
  /**
   * Initialize the parts bin view
   */
  function init() {
    // Setup type filter
    const typeFilter = document.getElementById('part-bin-filter-type');
    if (typeFilter) {
      typeFilter.addEventListener('change', refresh);
    }
    
    // Setup refresh button
    const refreshBtn = document.getElementById('refresh-parts-bin');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refresh);
    }
  }
  
  /**
   * Refresh the parts bin
   */
  function refresh() {
    try {
      const typeFilter = document.getElementById('part-bin-filter-type');
      const type = typeFilter ? typeFilter.value : 'all';
      
      // Get parts in bin
      const partsInBin = window.PartModel.getPartsInBin(type);
      const binContainer = document.getElementById('parts-bin-container');
      
      // Clear container
      if (binContainer) {
        binContainer.innerHTML = '';
        
        if (partsInBin.length === 0) {
          binContainer.innerHTML = '<p>No parts in bin matching the selected filter.</p>';
        } else {
          // Create part cards
          partsInBin.forEach(part => {
            const partCard = document.createElement('div');
            partCard.className = 'part-card';
            partCard.setAttribute('data-part-id', part.id);
            
            // Part header
            const partHeader = document.createElement('div');
            partHeader.className = 'part-card-header';
            partHeader.textContent = `${part.brand} ${part.model}`;
            partCard.appendChild(partHeader);
            
            // Part details
            const partDetails = document.createElement('div');
            partDetails.className = 'part-details';
            
            // Type
            const partType = document.createElement('p');
            partType.innerHTML = `<strong>Type:</strong> ${part.type.charAt(0).toUpperCase() + part.type.slice(1)}`;
            partDetails.appendChild(partType);
            
            // Acquisition date
            if (part.acquisition_date) {
              const acquisitionDate = document.createElement('p');
              let dateStr = 'Unknown';
              
              if (part.acquisition_date) {
                const date = new Date(part.acquisition_date);
                
                if (part.date_precision === 'year') {
                  dateStr = date.getFullYear().toString();
                } else if (part.date_precision === 'month') {
                  dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                } else {
                  dateStr = date.toISOString().split('T')[0];
                }
              }
              
              acquisitionDate.innerHTML = `<strong>Acquired:</strong> ${dateStr}`;
              partDetails.appendChild(acquisitionDate);
            }
            
            // Notes
            if (part.notes) {
              const partNotes = document.createElement('p');
              partNotes.innerHTML = `<strong>Notes:</strong> ${part.notes}`;
              partDetails.appendChild(partNotes);
            }
            
            partCard.appendChild(partDetails);
            
            // Part actions
            const partActions = document.createElement('div');
            partActions.className = 'part-card-actions';
            
            // Edit button
            const editButton = document.createElement('button');
            editButton.className = 'edit-btn';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => {
              window.PartController.showPartEditForm(part.id);
            });
            partActions.appendChild(editButton);
            
            // Connect button (if part is not motherboard)
            if (part.type !== 'motherboard') {
              const connectButton = document.createElement('button');
              connectButton.className = 'connect-btn';
              connectButton.textContent = 'Connect';
              connectButton.addEventListener('click', () => {
                window.ConnectionController.showConnectOptions(part.id);
              });
              partActions.appendChild(connectButton);
            }
            
            // Add Rig button (if part is motherboard)
            if (part.type === 'motherboard') {
              const addRigButton = document.createElement('button');
              addRigButton.className = 'rig-btn';
              addRigButton.textContent = 'Add Rig Identity';
              addRigButton.addEventListener('click', () => {
                window.RigController.showRigAddForm(part.id);
              });
              partActions.appendChild(addRigButton);
            }
            
            // Dispose button
            const disposeButton = document.createElement('button');
            disposeButton.className = 'delete-btn';
            disposeButton.textContent = 'Dispose';
            disposeButton.addEventListener('click', () => {
              window.DisposalController.showDisposeOptions(part.id);
            });
            partActions.appendChild(disposeButton);
            
            // Timeline button
            const timelineButton = document.createElement('button');
            timelineButton.className = 'view-timeline-btn';
            timelineButton.textContent = 'Timeline';
            timelineButton.addEventListener('click', () => {
              window.TimelineView.showPartTimeline(part.id);
            });
            partActions.appendChild(timelineButton);
            
            partCard.appendChild(partActions);
            
            binContainer.appendChild(partCard);
          });
        }
      }
    } catch (err) {
      console.error('Error refreshing parts bin:', err);
    }
  }
  
  // Public API
  return {
    init,
    refresh
  };
})();