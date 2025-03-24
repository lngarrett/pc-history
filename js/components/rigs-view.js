/**
 * Rigs View component for PC History Tracker
 * Handles rendering and actions for rigs tab
 */

// Create namespace
window.RigsView = (function() {
  // Private members
  
  /**
   * Initialize the rigs view
   */
  function init() {
    // Setup refresh button for parts bin if it exists
    const refreshBtn = document.getElementById('refresh-rigs');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refresh);
    }
  }
  
  /**
   * Refresh the rigs list
   */
  function refresh() {
    try {
      // Get active rigs
      const activeRigs = window.RigModel.getActiveRigs();
      const rigsContainer = document.getElementById('rigs-container');
      
      // Clear container
      if (rigsContainer) {
        rigsContainer.innerHTML = '';
        
        if (activeRigs.length === 0) {
          rigsContainer.innerHTML = '<p>No active rigs found.</p>';
        } else {
          // Create rig cards
          activeRigs.forEach(rig => {
            const rigCard = document.createElement('div');
            rigCard.className = 'rig-card';
            rigCard.setAttribute('data-rig-id', rig.id);
            
            // Rig header
            const rigHeader = document.createElement('div');
            rigHeader.className = 'rig-card-header';
            
            const rigTitle = document.createElement('h3');
            rigTitle.className = 'rig-card-title';
            rigTitle.textContent = rig.rig_name || `${rig.brand} ${rig.model}`;
            rigHeader.appendChild(rigTitle);
            
            // Action buttons
            const actionButtons = document.createElement('div');
            
            // Add identity button
            if (!rig.rig_name) {
              const addIdentityButton = document.createElement('button');
              addIdentityButton.className = 'small-btn';
              addIdentityButton.textContent = 'Add Identity';
              addIdentityButton.addEventListener('click', () => {
                window.RigController.showRigAddForm(rig.id);
              });
              actionButtons.appendChild(addIdentityButton);
            } else {
              // Edit identity button
              const editIdentityButton = document.createElement('button');
              editIdentityButton.className = 'small-btn edit-btn';
              editIdentityButton.textContent = 'Edit';
              editIdentityButton.addEventListener('click', () => {
                const rigIdentities = window.RigModel.getRigIdentities(rig.id);
                if (rigIdentities && rigIdentities.length > 0) {
                  const activeIdentity = rigIdentities.find(identity => !identity.active_until);
                  if (activeIdentity) {
                    window.RigController.showRigEditForm(activeIdentity.id);
                  }
                }
              });
              actionButtons.appendChild(editIdentityButton);
              
              // Deactivate button
              const deactivateButton = document.createElement('button');
              deactivateButton.className = 'small-btn disconnect-btn';
              deactivateButton.textContent = 'Deactivate';
              deactivateButton.addEventListener('click', () => {
                const rigIdentities = window.RigModel.getRigIdentities(rig.id);
                if (rigIdentities && rigIdentities.length > 0) {
                  const activeIdentity = rigIdentities.find(identity => !identity.active_until);
                  if (activeIdentity) {
                    window.RigController.showRigDeactivationForm(activeIdentity.id);
                  }
                }
              });
              actionButtons.appendChild(deactivateButton);
            }
            
            rigHeader.appendChild(actionButtons);
            rigCard.appendChild(rigHeader);
            
            // Rig details
            const rigDetails = document.createElement('div');
            rigDetails.className = 'rig-details';
            
            // Motherboard info
            const motherboardInfo = document.createElement('p');
            motherboardInfo.innerHTML = `<strong>Motherboard:</strong> ${rig.brand} ${rig.model}`;
            rigDetails.appendChild(motherboardInfo);
            
            // Active since
            if (rig.active_from) {
              const activeSince = document.createElement('p');
              let dateStr = 'Unknown';
              
              if (rig.active_from) {
                const date = new Date(rig.active_from);
                
                if (rig.active_from_precision === 'year') {
                  dateStr = date.getFullYear().toString();
                } else if (rig.active_from_precision === 'month') {
                  dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                } else {
                  dateStr = date.toISOString().split('T')[0];
                }
              }
              
              activeSince.innerHTML = `<strong>Active since:</strong> ${dateStr}`;
              rigDetails.appendChild(activeSince);
            }
            
            // Connected parts count
            const connectedParts = document.createElement('p');
            connectedParts.innerHTML = `<strong>Connected parts:</strong> ${rig.connected_parts}`;
            rigDetails.appendChild(connectedParts);
            
            rigCard.appendChild(rigDetails);
            
            // Parts list
            const partsList = document.createElement('div');
            partsList.className = 'rig-parts-list';
            
            // Get connected parts
            try {
              const connectedPartsList = window.ConnectionModel.getActiveConnectionsForMotherboard(rig.id);
              
              if (connectedPartsList && connectedPartsList.length > 0) {
                const partsListTitle = document.createElement('h4');
                partsListTitle.textContent = 'Connected Parts';
                partsList.appendChild(partsListTitle);
                
                const partsListItems = document.createElement('ul');
                partsListItems.className = 'rig-parts-list-items';
                
                connectedPartsList.forEach(part => {
                  const partItem = document.createElement('li');
                  partItem.className = 'rig-part-item';
                  
                  const partInfo = document.createElement('div');
                  partInfo.className = 'part-info';
                  partInfo.innerHTML = `<strong>${part.part_type}:</strong> ${part.part_brand} ${part.part_model}`;
                  partItem.appendChild(partInfo);
                  
                  const partActions = document.createElement('div');
                  partActions.className = 'part-actions';
                  
                  // Disconnect button
                  const disconnectButton = document.createElement('button');
                  disconnectButton.className = 'small-btn disconnect-btn';
                  disconnectButton.textContent = 'Disconnect';
                  disconnectButton.addEventListener('click', () => {
                    window.ConnectionController.showDisconnectOptions(part.part_id);
                  });
                  partActions.appendChild(disconnectButton);
                  
                  // View timeline button
                  const timelineButton = document.createElement('button');
                  timelineButton.className = 'small-btn view-timeline-btn';
                  timelineButton.textContent = 'Timeline';
                  timelineButton.addEventListener('click', () => {
                    window.TimelineView.showPartTimeline(part.part_id);
                  });
                  partActions.appendChild(timelineButton);
                  
                  partItem.appendChild(partActions);
                  partsListItems.appendChild(partItem);
                });
                
                partsList.appendChild(partsListItems);
              } else {
                partsList.innerHTML = '<p>No parts connected yet.</p>';
              }
            } catch (err) {
              console.error('Error fetching connected parts:', err);
              partsList.innerHTML = '<p>Error loading connected parts.</p>';
            }
            
            rigCard.appendChild(partsList);
            rigsContainer.appendChild(rigCard);
          });
        }
      }
      
      // Get historical rigs
      const historicalRigs = window.RigModel.getHistoricalRigs();
      const historicalRigsContainer = document.getElementById('historical-rigs-container');
      
      // Clear container
      if (historicalRigsContainer) {
        historicalRigsContainer.innerHTML = '';
        
        if (historicalRigs.length === 0) {
          historicalRigsContainer.innerHTML = '<p>No historical rigs found.</p>';
        } else {
          // Create historical rig cards
          historicalRigs.forEach(rig => {
            const rigCard = document.createElement('div');
            rigCard.className = 'rig-card historical';
            rigCard.setAttribute('data-rig-id', rig.id);
            
            // Rig header
            const rigHeader = document.createElement('div');
            rigHeader.className = 'rig-card-header';
            
            const rigTitle = document.createElement('h3');
            rigTitle.className = 'rig-card-title';
            rigTitle.textContent = rig.rig_name || `${rig.brand} ${rig.model}`;
            rigHeader.appendChild(rigTitle);
            
            rigCard.appendChild(rigHeader);
            
            // Rig details
            const rigDetails = document.createElement('div');
            rigDetails.className = 'rig-details';
            
            // Motherboard info
            const motherboardInfo = document.createElement('p');
            motherboardInfo.innerHTML = `<strong>Motherboard:</strong> ${rig.brand} ${rig.model}`;
            rigDetails.appendChild(motherboardInfo);
            
            // Active period
            if (rig.active_from && rig.active_until) {
              const activePeriod = document.createElement('p');
              
              let fromDateStr = 'Unknown';
              if (rig.active_from) {
                const date = new Date(rig.active_from);
                
                if (rig.active_from_precision === 'year') {
                  fromDateStr = date.getFullYear().toString();
                } else if (rig.active_from_precision === 'month') {
                  fromDateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                } else {
                  fromDateStr = date.toISOString().split('T')[0];
                }
              }
              
              let untilDateStr = 'Unknown';
              if (rig.active_until) {
                const date = new Date(rig.active_until);
                
                if (rig.active_until_precision === 'year') {
                  untilDateStr = date.getFullYear().toString();
                } else if (rig.active_until_precision === 'month') {
                  untilDateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                } else {
                  untilDateStr = date.toISOString().split('T')[0];
                }
              }
              
              activePeriod.innerHTML = `<strong>Active period:</strong> ${fromDateStr} to ${untilDateStr}`;
              rigDetails.appendChild(activePeriod);
            }
            
            rigCard.appendChild(rigDetails);
            
            // View timeline button
            const timelineButton = document.createElement('button');
            timelineButton.className = 'view-timeline-btn';
            timelineButton.textContent = 'View Timeline';
            timelineButton.addEventListener('click', () => {
              window.TimelineView.showPartTimeline(rig.id);
            });
            rigCard.appendChild(timelineButton);
            
            historicalRigsContainer.appendChild(rigCard);
          });
        }
      }
    } catch (err) {
      console.error('Error refreshing rigs list:', err);
    }
  }
  
  // Public API
  return {
    init,
    refresh
  };
})();