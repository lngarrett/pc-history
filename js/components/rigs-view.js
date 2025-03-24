/**
 * Rigs View component for PC History Tracker
 * Handles rendering and actions for rigs tab
 */

// Create namespace
window.RigsView = (function() {
  // Private members
  
  /**
   * Generate a color from a rig name for consistent visual identity
   * @param {string} name - Rig name
   * @returns {string} Color in HSL format
   */
  function getColorFromRigName(name) {
    if (!name) return 'hsl(0, 0%, 75%)'; // Default gray
    
    // Simple hash function to generate a number from a string
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Avoid colors that are too similar by using predetermined hue ranges
    // Divide the color wheel into 12 segments and select one based on hash
    const segment = Math.abs(hash % 12);
    const hueBase = segment * 30; // 12 segments * 30 degrees = 360 degrees
    
    // Add some variation within the segment
    const hueVariation = Math.abs((hash >> 4) % 20) - 10; // -10 to +10 degrees
    const hue = (hueBase + hueVariation + 360) % 360;
    
    // Ensure good saturation and lightness for all colors
    const saturation = 75 + Math.abs((hash >> 8) % 15); // 75% to 90% saturation
    const lightness = 75 + Math.abs((hash >> 12) % 10); // 75% to 85% lightness
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  
  /**
   * Show the historical parts for a rig
   * @param {number} motherboardId - Motherboard ID
   * @param {string} startDate - Rig start date
   * @param {string} endDate - Rig end date
   */
  function showRigPartsHistory(motherboardId, startDate, endDate) {
    const db = window.DatabaseService.getDatabase();
    if (!db) {
      window.DOMUtils.showToast('No database is open', 'error');
      return;
    }
    
    try {
      // Fetch parts that were connected to this motherboard during the given period
      const query = `
        SELECT 
          p.id,
          p.brand,
          p.model,
          p.type,
          c.connected_at,
          c.connected_precision,
          c.disconnected_at,
          c.disconnected_precision,
          c.notes
        FROM parts p
        JOIN connections c ON p.id = c.part_id
        WHERE c.motherboard_id = ${motherboardId}
          AND c.connected_at <= '${endDate}'
          AND (c.disconnected_at IS NULL OR c.disconnected_at >= '${startDate}')
        ORDER BY p.type, c.connected_at
      `;
      
      const result = db.exec(query);
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      // Get motherboard info for title
      const motherboardQuery = `
        SELECT brand, model FROM parts WHERE id = ${motherboardId}
      `;
      const motherboardResult = db.exec(motherboardQuery);
      
      if (motherboardResult.length > 0 && motherboardResult[0].values.length > 0) {
        const [brand, model] = motherboardResult[0].values[0];
        const title = window.DOMUtils.createElement('h3', {}, `${brand} ${model} - Parts History`);
        content.appendChild(title);
      }
      
      // Format dates for display
      const formattedStartDate = window.DateUtils.formatDateByPrecision(startDate, 'day');
      const formattedEndDate = window.DateUtils.formatDateByPrecision(endDate, 'day');
      
      const dateRange = window.DOMUtils.createElement('p', {}, 
        `Parts connected between ${formattedStartDate} and ${formattedEndDate}`);
      content.appendChild(dateRange);
      
      if (result.length === 0 || result[0].values.length === 0) {
        content.appendChild(window.DOMUtils.createElement('p', {}, 'No parts found for this rig during this period.'));
      } else {
        // Create table
        const table = window.DOMUtils.createElement('table', { className: 'data-table' });
        
        // Header
        const thead = window.DOMUtils.createElement('thead');
        const headerRow = window.DOMUtils.createElement('tr');
        
        ['Type', 'Brand', 'Model', 'Connected', 'Disconnected', 'Notes'].forEach(header => {
          headerRow.appendChild(window.DOMUtils.createElement('th', {}, header));
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = window.DOMUtils.createElement('tbody');
        
        // Map columns to parts
        const columns = result[0].columns;
        const parts = result[0].values.map(row => {
          const part = {};
          columns.forEach((column, index) => {
            part[column] = row[index];
          });
          return part;
        });
        
        // Group parts by type
        const groupedParts = {};
        parts.forEach(part => {
          if (!groupedParts[part.type]) {
            groupedParts[part.type] = [];
          }
          groupedParts[part.type].push(part);
        });
        
        // Render each part
        parts.forEach(part => {
          const row = window.DOMUtils.createElement('tr');
          
          // Type with icon
          const typeCell = window.DOMUtils.createElement('td', {});
          const typeText = part.type.charAt(0).toUpperCase() + part.type.slice(1);
          
          // Set up icon
          let iconBaseName = part.type;
          
          // Handle special case for PSU (which is stored as 'psu' but file is 'powersupply')
          if (part.type === 'psu') {
            iconBaseName = 'powersupply';
          }
          
          // Check what icons are available and use SVG if it exists
          const isSvg = ['cpu', 'gpu', 'ram', 'storage'].includes(part.type);
          const iconExtension = isSvg ? 'svg' : 'png';
          
          const typeWithIcon = window.DOMUtils.createElement('div', { 
            className: 'type-with-icon' 
          });
          
          const typeIcon = window.DOMUtils.createElement('div', { 
            className: `part-type-icon ${isSvg ? 'svg-icon' : ''}`,
            style: {
              backgroundImage: `url('assets/icons/${iconBaseName}.${iconExtension}')`
            }
          });
          
          typeWithIcon.appendChild(typeIcon);
          typeWithIcon.appendChild(window.DOMUtils.createElement('span', {}, typeText));
          typeCell.appendChild(typeWithIcon);
          
          // Brand
          const brandCell = window.DOMUtils.createElement('td', {}, part.brand);
          
          // Model with link
          const modelCell = window.DOMUtils.createElement('td', {});
          const modelLink = window.DOMUtils.createElement('a', {
            href: `https://www.google.com/search?q=${encodeURIComponent(`${part.brand} ${part.model} ${part.type}`)}`,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'model-link'
          }, part.model);
          modelCell.appendChild(modelLink);
          
          // Connected date
          const connectedStr = window.DateUtils.formatDateByPrecision(
            part.connected_at, 
            part.connected_precision || 'day'
          );
          const connectedCell = window.DOMUtils.createElement('td', {}, connectedStr);
          
          // Disconnected date
          let disconnectedStr = 'Still connected';
          if (part.disconnected_at) {
            disconnectedStr = window.DateUtils.formatDateByPrecision(
              part.disconnected_at, 
              part.disconnected_precision || 'day'
            );
          }
          const disconnectedCell = window.DOMUtils.createElement('td', {}, disconnectedStr);
          
          // Notes
          const notesCell = window.DOMUtils.createElement('td', {}, part.notes || '');
          
          // Add cells to row
          row.appendChild(typeCell);
          row.appendChild(brandCell);
          row.appendChild(modelCell);
          row.appendChild(connectedCell);
          row.appendChild(disconnectedCell);
          row.appendChild(notesCell);
          
          tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        content.appendChild(table);
      }
      
      // Show modal with parts history
      window.DOMUtils.showModal('Rig Parts History', content);
    } catch (err) {
      console.error('Error showing rig parts history:', err);
      window.DOMUtils.showToast('Error showing rig parts history', 'error');
    }
  }
  
  // Refresh timer handle
  let refreshTimer = null;
  
  /**
   * Initialize the rigs view
   */
  function init() {
    console.log('Initializing RigsView...');
    
    // Setup refresh button for rigs if it exists
    const refreshBtn = document.getElementById('refresh-rigs');
    if (refreshBtn) {
      console.log('Found refresh-rigs button, setting up event listener');
      refreshBtn.addEventListener('click', refresh);
    } else {
      console.warn('No refresh-rigs button found in the DOM');
    }
    
    // Set up automatic refresh every 2 seconds when the tab is active
    const rigsTab = document.getElementById('rigs-tab');
    if (rigsTab) {
      console.log('Found rigs-tab element, setting up observer');
      
      // Auto-refresh when the tab becomes visible
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class' && 
              rigsTab.classList.contains('active')) {
            // Tab is now active, refresh once and start timer
            console.log('Rigs tab is now active, refreshing');
            refresh();
            startRefreshTimer();
          } else if (mutation.attributeName === 'class' && 
                    !rigsTab.classList.contains('active')) {
            // Tab is no longer active, clear timer
            console.log('Rigs tab is no longer active, stopping refresh timer');
            stopRefreshTimer();
          }
        });
      });
      
      observer.observe(rigsTab, { attributes: true });
      
      // Initial refresh if tab is active
      if (rigsTab.classList.contains('active')) {
        console.log('Rigs tab is initially active, refreshing');
        refresh();
        startRefreshTimer();
      }
    } else {
      console.warn('No rigs-tab element found in the DOM');
    }
    
    // Force an initial refresh regardless of tab state
    console.log('Forcing initial refresh of rigs view');
    refresh();
  }
  
  /**
   * Start the auto-refresh timer
   */
  function startRefreshTimer() {
    // Clear any existing timer
    stopRefreshTimer();
    
    // Set a new timer (every 2 seconds)
    refreshTimer = setInterval(() => {
      refresh();
    }, 2000); // 2 seconds
  }
  
  /**
   * Stop the auto-refresh timer
   */
  function stopRefreshTimer() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }
  
  /**
   * Refresh the rigs list
   */
  function refresh() {
    try {
      console.log('Refreshing rigs list...');
      
      // Get all motherboards
      const allMotherboards = window.RigModel.getActiveRigs();
      console.log('Retrieved motherboards:', allMotherboards);
      
      const rigsContainer = document.getElementById('rigs-container');
      
      // Clear container
      if (rigsContainer) {
        console.log('Found rigs-container, clearing it');
        rigsContainer.innerHTML = '';
        
        // Add admin button
        const adminSection = document.createElement('div');
        adminSection.className = 'admin-section';
        const adminButton = document.createElement('button');
        adminButton.className = 'admin-btn';
        adminButton.textContent = 'Rig Admin Tools';
        adminButton.addEventListener('click', () => {
          window.RigController.showRigAdminFunctions();
        });
        adminSection.appendChild(adminButton);
        rigsContainer.appendChild(adminSection);
        
        // Filter motherboards into categories:
        // 1. Active rigs (motherboards with connected parts)
        // 2. Inactive rigs (motherboards that have had parts but currently none)
        // 3. Pure motherboards (never had any parts - not rigs)
        const activeRigs = allMotherboards.filter(mb => mb.connected_parts > 0);
        const inactiveRigs = allMotherboards.filter(mb => mb.connected_parts === 0 && mb.has_been_rig === 1);
        const pureMotherboards = allMotherboards.filter(mb => mb.connected_parts === 0 && mb.has_been_rig === 0);
        
        console.log('Filtered motherboards:', {
          activeRigs: activeRigs.length,
          inactiveRigs: inactiveRigs.length,
          pureMotherboards: pureMotherboards.length
        });
        
        // When there's nothing
        if (activeRigs.length === 0) {
          if (pureMotherboards.length === 0) {
            const noRigsMessage = document.createElement('p');
            noRigsMessage.textContent = 'No motherboards found. Add a motherboard first.';
            rigsContainer.appendChild(noRigsMessage);
          } else {
            const noRigsMessage = document.createElement('p');
            noRigsMessage.textContent = 'No active rigs found. Connect parts to a motherboard to create a rig.';
            rigsContainer.appendChild(noRigsMessage);
          }
        } else {
          // Create rig cards
          console.log('Creating rig cards for active rigs:', activeRigs);
          activeRigs.forEach(rig => {
            const rigCard = document.createElement('div');
            rigCard.className = 'rig-card';
            rigCard.setAttribute('data-rig-id', rig.id);
            
            // Compute rig lifecycle for this motherboard
            const lifecycles = window.RigModel.computeRigLifecycles(rig.id);
            console.log(`Computed lifecycles for rig ${rig.id}:`, lifecycles);
            
            const activeLifecycle = lifecycles.find(cycle => cycle.active);
            console.log(`Active lifecycle for rig ${rig.id}:`, activeLifecycle);
            
            // Look up rig name for this lifecycle
            let rigName = null;
            if (activeLifecycle) {
              rigName = window.RigModel.getRigName(rig.id, activeLifecycle.start_date);
              console.log(`Found rig name for lifecycle:`, rigName);
            }
            
            // Rig header
            const rigHeader = document.createElement('div');
            rigHeader.className = 'rig-card-header';
            
            const rigTitle = document.createElement('h3');
            rigTitle.className = 'rig-card-title';
            const displayName = (rigName ? rigName.name : rig.rig_name) || `${rig.brand} ${rig.model}`;
            console.log(`Display name for rig ${rig.id}: ${displayName}`);
            rigTitle.textContent = displayName;
            rigHeader.appendChild(rigTitle);
            
            // Action buttons
            const actionButtons = document.createElement('div');
            
            // Only show the name button if there are parts connected (a real "rig")
            if (rig.connected_parts > 0) {
              // Check for an active lifecycle
              const hasLifecycle = activeLifecycle || rig.connected_parts > 0;
              
              if (hasLifecycle) {
                if (!rigName && !rig.rig_name) {
                  // No name - show add button
                  const addNameButton = document.createElement('button');
                  addNameButton.className = 'small-btn';
                  addNameButton.textContent = 'Name Rig';
                  addNameButton.addEventListener('click', () => {
                    window.RigController.showRigAddForm(rig.id);
                  });
                  actionButtons.appendChild(addNameButton);
                } else {
                  // Has name - show edit button
                  const editNameButton = document.createElement('button');
                  editNameButton.className = 'small-btn edit-btn';
                  editNameButton.textContent = 'Edit Name';
                  editNameButton.addEventListener('click', () => {
                    // For backward compatibility, try to find a rig identity to edit
                    const rigIdentities = window.RigModel.getRigIdentities(rig.id);
                    if (rigIdentities && rigIdentities.length > 0) {
                      const activeIdentity = rigIdentities.find(identity => !identity.active_until);
                      if (activeIdentity) {
                        window.RigController.showRigEditForm(activeIdentity.id);
                      } else {
                        // Fallback if no active identity is found
                        window.RigController.showRigAddForm(rig.id);
                      }
                    } else {
                      // No identities found, just show the add form
                      window.RigController.showRigAddForm(rig.id);
                    }
                  });
                  actionButtons.appendChild(editNameButton);
                  
                  // Deactivate button
                  const deactivateButton = document.createElement('button');
                  deactivateButton.className = 'small-btn disconnect-btn';
                  deactivateButton.textContent = 'Deactivate';
                  deactivateButton.addEventListener('click', () => {
                    // For backward compatibility
                    const rigIdentities = window.RigModel.getRigIdentities(rig.id);
                    if (rigIdentities && rigIdentities.length > 0) {
                      const activeIdentity = rigIdentities.find(identity => !identity.active_until);
                      if (activeIdentity) {
                        window.RigController.showRigDeactivationForm(activeIdentity.id);
                      } else {
                        window.RigController.showRigDeactivationForm(rig.id);
                      }
                    } else {
                      window.RigController.showRigDeactivationForm(rig.id);
                    }
                  });
                  actionButtons.appendChild(deactivateButton);
                  
                  // View Full History button
                  const historyButton = document.createElement('button');
                  historyButton.className = 'small-btn view-timeline-btn';
                  historyButton.textContent = 'View Full History';
                  historyButton.addEventListener('click', () => {
                    if (window.RigHistoryView && typeof window.RigHistoryView.showRigHistory === 'function') {
                      window.RigHistoryView.showRigHistory(rig.id, activeLifecycle.start_date);
                    }
                  });
                  actionButtons.appendChild(historyButton);
                }
              } 
            } else {
              // This is just a motherboard with no parts - show different options
              const connectPartsButton = document.createElement('button');
              connectPartsButton.className = 'small-btn';
              connectPartsButton.textContent = 'Connect Parts';
              connectPartsButton.addEventListener('click', () => {
                // Navigate to the parts tab
                document.getElementById('tab-parts').click();
              });
              actionButtons.appendChild(connectPartsButton);
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
            
            // Active since - compute from the lifecycle
            if (activeLifecycle && activeLifecycle.start_date) {
              const activeSince = document.createElement('p');
              let dateStr = 'Unknown';
              
              const date = new Date(activeLifecycle.start_date);
              const precision = activeLifecycle.start_precision || 'day';
              
              if (precision === 'year') {
                dateStr = date.getFullYear().toString();
              } else if (precision === 'month') {
                dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              } else {
                dateStr = date.toISOString().split('T')[0];
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
      console.log('Retrieved historical rigs:', historicalRigs);
      
      const historicalRigsContainer = document.getElementById('historical-rigs-container');
      
      // Clear container
      if (historicalRigsContainer) {
        console.log('Found historical-rigs-container, clearing it');
        historicalRigsContainer.innerHTML = '';
        
        if (historicalRigs.length === 0) {
          historicalRigsContainer.innerHTML = '<p>No historical rigs found.</p>';
        } else {
          console.log('Creating historical rig cards:', historicalRigs.length);
          // Create historical rig cards
          historicalRigs.forEach(rig => {
            console.log('Creating historical rig card for:', rig);
            
            const rigCard = document.createElement('div');
            rigCard.className = 'rig-card historical';
            rigCard.setAttribute('data-rig-id', rig.id);
            rigCard.setAttribute('data-motherboard-id', rig.id);
            
            // Look up the rig name using the start date from the historical record
            let rigName = null;
            
            // Try to get the rig name using the rig_names table
            if (rig.rig_start_date) {
              console.log(`Looking up rig name for historical rig ${rig.id} with start date ${rig.rig_start_date}`);
              rigName = window.RigModel.getRigName(rig.id, rig.rig_start_date);
              console.log('Found rig name from rig_names:', rigName);
            }
            
            // Determine display name priority:
            // 1. Use the name from rig_names table if found via lookup
            // 2. Use the rig_name_from_lookup field from the query if present
            // 3. Use the historical rig_name from the query if present
            // 4. Fall back to brand/model
            const displayName = (rigName ? rigName.name : 
                               (rig.rig_name_from_lookup ? rig.rig_name_from_lookup : 
                               (rig.rig_name ? rig.rig_name : 
                               `${rig.brand} ${rig.model}`)));
            console.log(`Display name for historical rig ${rig.id}: ${displayName}`);
            
            // Get a color for this rig for consistent visual identity
            // Even though it's historical, we want to maintain the color coding
            const rigColor = getColorFromRigName(displayName);
            rigCard.style.borderTopColor = rigColor;
            
            // Rig header
            const rigHeader = document.createElement('div');
            rigHeader.className = 'rig-card-header';
            
            const rigTitle = document.createElement('h3');
            rigTitle.className = 'rig-card-title';
            rigTitle.textContent = displayName;
            rigHeader.appendChild(rigTitle);
            
            rigCard.appendChild(rigHeader);
            
            // Rig details
            const rigDetails = document.createElement('div');
            rigDetails.className = 'rig-details';
            
            // Motherboard info
            const motherboardInfo = document.createElement('p');
            motherboardInfo.innerHTML = `<strong>Motherboard:</strong> ${rig.brand} ${rig.model}`;
            rigDetails.appendChild(motherboardInfo);
            
            // Active period - using the rig lifecycle dates instead of the identity dates
            if (rig.rig_start_date && rig.rig_end_date) {
              const activePeriod = document.createElement('p');
              
              // Format start date
              let startDateStr = window.DateUtils.formatDateByPrecision(
                rig.rig_start_date,
                rig.rig_start_precision || 'day'
              );
              
              // Format end date
              let endDateStr = window.DateUtils.formatDateByPrecision(
                rig.rig_end_date,
                rig.rig_end_precision || 'day'
              );
              
              activePeriod.innerHTML = `<strong>Active period:</strong> ${startDateStr} to ${endDateStr}`;
              rigDetails.appendChild(activePeriod);
              
              // Total parts
              if (rig.total_parts) {
                const partsCount = document.createElement('p');
                partsCount.innerHTML = `<strong>Parts:</strong> ${rig.total_parts} components`;
                rigDetails.appendChild(partsCount);
              }
            }
            
            rigCard.appendChild(rigDetails);
            
            // Button container for actions
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'rig-card-actions';
            
            // Edit name button
            const editNameButton = document.createElement('button');
            editNameButton.className = 'edit-btn';
            editNameButton.textContent = 'Edit Name';
            editNameButton.addEventListener('click', () => {
              // Create edit form for historical rig name
              const content = DOMUtils.createElement('div', { className: 'rig-form' });
              
              // Name input
              content.appendChild(DOMUtils.createElement('div', { className: 'form-group' }, [
                DOMUtils.createElement('label', { for: 'historical-rig-name' }, 'Rig Name:'),
                DOMUtils.createElement('input', { 
                  type: 'text', 
                  id: 'historical-rig-name', 
                  className: 'form-control', 
                  value: displayName,
                  required: true
                })
              ]));
              
              // Notes
              content.appendChild(DOMUtils.createElement('div', { className: 'form-group' }, [
                DOMUtils.createElement('label', { for: 'historical-rig-notes' }, 'Notes:'),
                DOMUtils.createElement('textarea', { 
                  id: 'historical-rig-notes', 
                  rows: 3, 
                  className: 'form-control' 
                }, rigName ? rigName.notes : '')
              ]));
              
              // Submit button
              const submitButton = DOMUtils.createButton('Update Rig Name', 'primary-button', async () => {
                const name = document.getElementById('historical-rig-name').value.trim();
                const notes = document.getElementById('historical-rig-notes').value.trim();
                
                // Validate
                if (!name) {
                  alert('Please enter a rig name');
                  return;
                }
                
                try {
                  // Update the rig name
                  window.RigModel.setRigName(rig.id, rig.rig_start_date, name, notes);
                  
                  // Update state
                  window.App.hasUnsavedChanges = true;
                  window.App.updateSaveStatus();
                  
                  // Save the database
                  await window.App.saveDatabase();
                  
                  // Refresh the view
                  refresh();
                  
                  // Close the modal
                  document.body.removeChild(modal);
                  
                  window.DOMUtils.showToast('Historical rig name updated', 'success');
                } catch (err) {
                  console.error('Error updating historical rig name:', err);
                  alert('Error updating historical rig name: ' + err.message);
                }
              });
              
              content.appendChild(submitButton);
              
              // Show the modal
              const modal = window.DOMUtils.showModal('Edit Historical Rig Name', content);
            });
            buttonContainer.appendChild(editNameButton);
            
            // View Full History button
            const historyButton = document.createElement('button');
            historyButton.className = 'view-timeline-btn';
            historyButton.textContent = 'View Full History';
            historyButton.addEventListener('click', () => {
              if (window.RigHistoryView && typeof window.RigHistoryView.showRigHistory === 'function') {
                window.RigHistoryView.showRigHistory(rig.id, rig.rig_start_date);
              }
            });
            buttonContainer.appendChild(historyButton);
            
            // View timeline button
            const timelineButton = document.createElement('button');
            timelineButton.className = 'view-timeline-btn';
            timelineButton.textContent = 'View Timeline';
            timelineButton.addEventListener('click', () => {
              window.TimelineView.showPartTimeline(rig.id);
            });
            buttonContainer.appendChild(timelineButton);
            
            // View parts button
            const viewPartsButton = document.createElement('button');
            viewPartsButton.className = 'view-parts-btn';
            viewPartsButton.textContent = 'View Parts';
            viewPartsButton.addEventListener('click', () => {
              // Show a modal with parts that were in this rig
              showRigPartsHistory(rig.id, rig.rig_start_date, rig.rig_end_date);
            });
            buttonContainer.appendChild(viewPartsButton);
            
            rigCard.appendChild(buttonContainer);
            
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
    refresh,
    startRefreshTimer,
    stopRefreshTimer
  };
})();