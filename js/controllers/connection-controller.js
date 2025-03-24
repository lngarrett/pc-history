/**
 * Connection Controller for PC History Tracker
 * Handles connecting and disconnecting parts
 */

// Create namespace
window.ConnectionController = (function() {
  // Private members
  
  /**
   * Show options for connecting a part to a motherboard
   * @param {number} partId - Part ID
   */
  function showConnectOptions(partId) {
    try {
      // Check that this part isn't a motherboard
      const part = window.PartModel.getPartById(partId);
      if (!part) {
        throw new Error('Part not found');
      }
      
      if (part.type === 'motherboard') {
        window.DOMUtils.showToast('Cannot connect a motherboard to another motherboard', 'error');
        return;
      }
      
      // Check if the part is already connected
      const activeConnections = window.ConnectionModel.getActiveConnectionsForPart(partId);
      if (activeConnections && activeConnections.length > 0) {
        window.DOMUtils.showToast('This part is already connected to a motherboard', 'error');
        return;
      }
      
      // Get all motherboards (not just active ones)
      const activeRigs = window.RigModel.getActiveRigs();
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      if (activeRigs.length === 0) {
        content.appendChild(window.DOMUtils.createElement('p', {}, 'No motherboards found. Add a motherboard first.'));
        window.DOMUtils.showModal('Connect Part', content);
        return;
      }
      
      // Part info
      content.appendChild(window.DOMUtils.createElement('p', {}, `Connect part: <strong>${part.brand} ${part.model}</strong>`));
      
      // Get acquisition date to use as default
      let defaultYear = null;
      let defaultMonth = null;
      let defaultDay = null;
      let acquisitionDateInfo = null;
      
      if (part.acquisition_date) {
        const dateParts = part.acquisition_date.split('-');
        defaultYear = parseInt(dateParts[0]);
        
        if (dateParts.length > 1 && part.date_precision !== 'year') {
          defaultMonth = parseInt(dateParts[1]);
        }
        
        if (dateParts.length > 2 && part.date_precision === 'day') {
          defaultDay = parseInt(dateParts[2]);
        }
        
        acquisitionDateInfo = {
          year: defaultYear,
          month: defaultMonth,
          day: defaultDay,
          precision: part.date_precision
        };
      }
      
      // Acquisition date info text
      if (acquisitionDateInfo) {
        const formattedDate = window.DateUtils.formatDateByPrecision(
          part.acquisition_date, 
          part.date_precision
        );
        
        content.appendChild(window.DOMUtils.createElement('p', {}, 
          `If no date is specified, the acquisition date (${formattedDate}) will be used as the connection date.`));
      }
      
      content.appendChild(window.DOMUtils.createElement('p', {}, 'Select a motherboard to connect this part to:'));
      
      // Create motherboard selection
      const motherboardSelect = window.DOMUtils.createElement('select', { id: 'connect-motherboard', className: 'form-control' });
      
      // Add options
      activeRigs.forEach(rig => {
        const option = window.DOMUtils.createElement('option', { value: rig.id }, 
          `${rig.brand} ${rig.model}${rig.rig_name ? ` (${rig.rig_name})` : ''}`);
        motherboardSelect.appendChild(option);
      });
      
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'connect-motherboard' }, 'Motherboard:'),
        motherboardSelect
      ]));
      
      // Create a conflict warning section (initially hidden)
      const conflictWarning = window.DOMUtils.createElement('div', { 
        id: 'conflict-warning',
        className: 'conflict-warning hidden'
      });
      
      content.appendChild(conflictWarning);
      
      // Function to check for conflicts when a motherboard is selected
      const checkForConflicts = () => {
        // Get the selected motherboard ID
        const motherboardId = parseInt(motherboardSelect.value);
        if (!motherboardId) return;
        
        // Check if there's already a part of the same type connected to this motherboard
        const activeConnections = window.ConnectionModel.getActiveConnectionsForMotherboard(motherboardId);
        const sameTypeParts = activeConnections.filter(conn => conn.part_type === part.type);
        
        // Clear previous warning
        conflictWarning.innerHTML = '';
        
        if (sameTypeParts.length > 0) {
          // Show the warning
          conflictWarning.classList.remove('hidden');
          
          // Add warning header
          conflictWarning.appendChild(window.DOMUtils.createElement('h3', {
            className: 'conflict-header'
          }, 'Conflict Detected'));
          
          // Create a conflict section for better styling
          const conflictSection = window.DOMUtils.createElement('div', {
            className: 'conflict-section',
            dataset: { partType: part.type }
          });
          
          // Add type header
          conflictSection.appendChild(window.DOMUtils.createElement('h4', {}, 
            `${part.type.charAt(0).toUpperCase() + part.type.slice(1)} Conflict`));
          
          // Show existing parts
          conflictSection.appendChild(window.DOMUtils.createElement('p', {}, 
            `${sameTypeParts.length} existing ${sameTypeParts.length > 1 ? 'parts' : 'part'}:`));
          
          // List the existing parts
          const existingPartsList = window.DOMUtils.createElement('ul', { className: 'existing-parts-list' });
          sameTypeParts.forEach(conn => {
            const listItem = window.DOMUtils.createElement('li', {});
            
            // Create type icon
            const typeIcon = window.DOMUtils.createElement('div', { 
              className: 'part-type-icon bulk-part-icon',
              title: part.type.charAt(0).toUpperCase() + part.type.slice(1)
            });
            
            // Set icon image based on part type
            let iconBaseName = part.type;
            
            // Handle special case for PSU (which is stored as 'psu' but file is 'powersupply')
            if (part.type === 'psu') {
              iconBaseName = 'powersupply';
            }
            
            // Check what icons are available and use SVG if it exists based on our file listing
            const isSvg = ['cpu', 'gpu', 'ram', 'storage'].includes(part.type);
            const iconExtension = isSvg ? 'svg' : 'png';
            
            // Set the background image with the appropriate extension
            typeIcon.style.backgroundImage = `url('assets/icons/${iconBaseName}.${iconExtension}')`;
            
            // SVG icons need special handling for color
            if (isSvg) {
              typeIcon.classList.add('svg-icon');
            }
            
            // Add icon to list item
            listItem.appendChild(typeIcon);
            
            // Add part name
            listItem.appendChild(window.DOMUtils.createElement('span', { className: 'part-name' }, 
              `${conn.part_brand} ${conn.part_model}`));
            
            existingPartsList.appendChild(listItem);
          });
          conflictSection.appendChild(existingPartsList);
          
          // Show new part being connected
          conflictSection.appendChild(window.DOMUtils.createElement('p', {}, 
            `New part to connect:`));
          
          // Show the part being connected
          const newPartsList = window.DOMUtils.createElement('ul', { className: 'new-parts-list' });
          
          // Create list item with icon
          const newPartItem = window.DOMUtils.createElement('li', {});
          
          // Create type icon
          const typeIcon = window.DOMUtils.createElement('div', { 
            className: 'part-type-icon bulk-part-icon',
            title: part.type.charAt(0).toUpperCase() + part.type.slice(1)
          });
          
          // Set icon image based on part type
          let iconBaseName = part.type;
          
          // Handle special case for PSU (which is stored as 'psu' but file is 'powersupply')
          if (part.type === 'psu') {
            iconBaseName = 'powersupply';
          }
          
          // Check what icons are available and use SVG if it exists based on our file listing
          const isSvg = ['cpu', 'gpu', 'ram', 'storage'].includes(part.type);
          const iconExtension = isSvg ? 'svg' : 'png';
          
          // Set the background image with the appropriate extension
          typeIcon.style.backgroundImage = `url('assets/icons/${iconBaseName}.${iconExtension}')`;
          
          // SVG icons need special handling for color
          if (isSvg) {
            typeIcon.classList.add('svg-icon');
          }
          
          // Add icon to list item
          newPartItem.appendChild(typeIcon);
          
          // Add part name
          newPartItem.appendChild(window.DOMUtils.createElement('span', { className: 'part-name' }, 
            `${part.brand} ${part.model}`));
          
          newPartsList.appendChild(newPartItem);
          conflictSection.appendChild(newPartsList);
          
          // Add checkbox for keeping existing parts
          const checkboxContainer = window.DOMUtils.createElement('div', { className: 'form-group' });
          
          const keepExistingCheckbox = window.DOMUtils.createElement('input', {
            type: 'checkbox',
            id: 'keep-existing-parts',
            name: 'keep-existing-parts'
          });
          
          const checkboxLabel = window.DOMUtils.createElement('label', {
            for: 'keep-existing-parts'
          }, `Keep existing ${part.type}${sameTypeParts.length > 1 ? 's' : ''} connected (unusual configuration)`);
          
          checkboxContainer.appendChild(keepExistingCheckbox);
          checkboxContainer.appendChild(checkboxLabel);
          
          conflictSection.appendChild(checkboxContainer);
          
          // Add explanation of what happens if not kept
          conflictSection.appendChild(window.DOMUtils.createElement('p', { className: 'conflict-info' }, 
            `If not checked, existing ${part.type}${sameTypeParts.length > 1 ? 's' : ''} will be automatically disconnected when this part is connected.`));
          
          // Add the section to the warning
          conflictWarning.appendChild(conflictSection);
        } else {
          // Hide the warning if no conflicts
          conflictWarning.classList.add('hidden');
        }
      };
      
      // Add event listener to the motherboard select to check for conflicts
      motherboardSelect.addEventListener('change', checkForConflicts);
      
      // Check for conflicts immediately if there's only one motherboard
      if (activeRigs.length === 1) {
        setTimeout(checkForConflicts, 0);
      }
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Connection Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'connect-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, acquisitionDateInfo ? 'Use acquisition date' : 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'connect-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'connect-day' });
      daySelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Day (optional)'));
      
      // Create status indicator for date
      const dateStatusIndicator = window.DOMUtils.createElement('div', {
        id: 'connect-date-status',
        className: 'date-status-indicator'
      });
      
      // Populate year select
      window.DateUtils.populateYearSelect(yearSelect);
      
      // Update days when month changes
      monthSelect.addEventListener('change', () => {
        const year = parseInt(yearSelect.value) || new Date().getFullYear();
        const month = parseInt(monthSelect.value) || null;
        window.DateUtils.populateDaySelect(daySelect, month, year);
      });
      
      yearSelect.addEventListener('change', () => {
        if (monthSelect.value) {
          const year = parseInt(yearSelect.value) || new Date().getFullYear();
          const month = parseInt(monthSelect.value) || null;
          window.DateUtils.populateDaySelect(daySelect, month, year);
        }
      });
      
      dateControls.appendChild(yearSelect);
      dateControls.appendChild(monthSelect);
      dateControls.appendChild(daySelect);
      
      dateSection.appendChild(dateControls);
      content.appendChild(dateSection);
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'connect-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'connect-notes', rows: 3 })
      ]));
      
      // Connect button
      const connectButton = window.DOMUtils.createButton('Connect Part', 'primary-button', () => {
        const motherboardId = parseInt(motherboardSelect.value);
        let year = parseInt(yearSelect.value);
        let month = monthSelect.value ? parseInt(monthSelect.value) : null;
        let day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('connect-notes').value.trim();
        
        if (!motherboardId) {
          alert('Please select a motherboard');
          return;
        }
        
        // If no date provided, use acquisition date if available
        if (!year && acquisitionDateInfo) {
          year = acquisitionDateInfo.year;
          month = acquisitionDateInfo.month;
          day = acquisitionDateInfo.day;
        } else if (!year) {
          alert('Please select a year or make sure the part has an acquisition date');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        // Get the keepExistingParts value from the checkbox if it exists
        let keepExistingParts = false;
        const keepExistingCheckbox = document.getElementById('keep-existing-parts');
        if (keepExistingCheckbox) {
          keepExistingParts = keepExistingCheckbox.checked;
        }
        
        try {
          // Connect the part with the keepExistingParts parameter
          window.ConnectionModel.connectPart(partId, motherboardId, dateInfo, notes, keepExistingParts);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh all affected views
          window.PartsList.refresh();
          
          // Also refresh the rigs view to update rig status
          if (window.RigsView && typeof window.RigsView.refresh === 'function') {
            window.RigsView.refresh();
          }
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(partId);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part connected successfully', 'success');
        } catch (err) {
          console.error('Error connecting part:', err);
          alert('Error connecting part: ' + err.message);
        }
      });
      
      content.appendChild(connectButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Connect Part', content);
    } catch (err) {
      console.error('Error showing connect options:', err);
      alert('Error showing connect options: ' + err.message);
    }
  }

  /**
   * Show options for disconnecting a part
   * @param {number} partId - Part ID
   */
  function showDisconnectOptions(partId) {
    try {
      // Get active connections for the part
      const activeConnections = window.ConnectionModel.getActiveConnectionsForPart(partId);
      
      if (activeConnections.length === 0) {
        alert('Part is not connected to any motherboard');
        return;
      }
      
      // Get the connection details
      const connection = activeConnections[0];
      const motherboardName = `${connection.motherboard_brand} ${connection.motherboard_model}`;
      const rigName = connection.rig_name ? ` (${connection.rig_name})` : '';
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      content.appendChild(window.DOMUtils.createElement('p', {}, `Disconnect this part from ${motherboardName}${rigName}?`));
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Disconnection Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'disconnect-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'disconnect-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'disconnect-day' });
      daySelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Day (optional)'));
      
      // Populate year select
      window.DateUtils.populateYearSelect(yearSelect);
      
      // Update days when month changes
      monthSelect.addEventListener('change', () => {
        const year = parseInt(yearSelect.value) || new Date().getFullYear();
        const month = parseInt(monthSelect.value) || null;
        window.DateUtils.populateDaySelect(daySelect, month, year);
      });
      
      yearSelect.addEventListener('change', () => {
        if (monthSelect.value) {
          const year = parseInt(yearSelect.value) || new Date().getFullYear();
          const month = parseInt(monthSelect.value) || null;
          window.DateUtils.populateDaySelect(daySelect, month, year);
        }
      });
      
      dateControls.appendChild(yearSelect);
      dateControls.appendChild(monthSelect);
      dateControls.appendChild(daySelect);
      
      dateSection.appendChild(dateControls);
      content.appendChild(dateSection);
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'disconnect-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'disconnect-notes', rows: 3 })
      ]));
      
      // Disconnect button
      const disconnectButton = window.DOMUtils.createButton('Disconnect Part', 'disconnect-btn', async () => {
        const year = parseInt(yearSelect.value);
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('disconnect-notes').value.trim();
        
        if (!year) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        try {
          // Disconnect the part
          window.ConnectionModel.disconnectPartById(partId, dateInfo, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Save database immediately and ensure it completes
          const saveResult = await window.App.saveDatabase();
          
          // Refresh all affected views
          window.PartsList.refresh();
          
          // Also refresh the rigs view to update rig status
          if (window.RigsView && typeof window.RigsView.refresh === 'function') {
            window.RigsView.refresh();
          }
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(partId);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part disconnected successfully', 'success');
        } catch (err) {
          console.error('Error disconnecting part:', err);
          alert('Error disconnecting part: ' + err.message);
        }
      });
      
      content.appendChild(disconnectButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Disconnect Part', content);
    } catch (err) {
      console.error('Error showing disconnect options:', err);
      alert('Error showing disconnect options: ' + err.message);
    }
  }

  /**
   * Show form for connecting multiple parts at once
   * @param {Array} partIds - Array of part IDs to connect
   */
  function showBulkConnectForm(partIds) {
    if (!partIds || partIds.length === 0) {
      return;
    }
    
    try {
      // Verify that all parts can be connected and gather info
      const partsToConnect = [];
      let commonAcquisitionDate = null;
      let allPartsHaveSameAcquisitionDate = true;
      
      for (const partId of partIds) {
        const part = window.PartModel.getPartById(partId);
        if (!part) {
          throw new Error(`Part with ID ${partId} not found`);
        }
        
        if (part.type === 'motherboard') {
          throw new Error('Cannot connect a motherboard to another motherboard');
        }
        
        // Check if the part is already connected
        const activeConnections = window.ConnectionModel.getActiveConnectionsForPart(partId);
        if (activeConnections && activeConnections.length > 0) {
          throw new Error(`Part ${part.brand} ${part.model} is already connected to a motherboard`);
        }
        
        // Store part for later use
        partsToConnect.push(part);
        
        // Check if acquisition dates are consistent
        if (part.acquisition_date) {
          if (commonAcquisitionDate === null) {
            commonAcquisitionDate = part.acquisition_date;
          } else if (commonAcquisitionDate !== part.acquisition_date) {
            allPartsHaveSameAcquisitionDate = false;
          }
        } else {
          allPartsHaveSameAcquisitionDate = false;
        }
      }
      
      // Get all motherboards
      const activeRigs = window.RigModel.getActiveRigs();
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      if (activeRigs.length === 0) {
        content.appendChild(window.DOMUtils.createElement('p', {}, 'No motherboards found. Add a motherboard first.'));
        window.DOMUtils.showModal('Connect Parts', content);
        return;
      }
      
      content.appendChild(window.DOMUtils.createElement('p', {}, `You are about to connect ${partIds.length} parts to a motherboard. All parts will share the same notes.`));
      
      // List parts to be connected
      const partsList = window.DOMUtils.createElement('ul', { className: 'parts-list' });
      partsToConnect.forEach(part => {
        // Create the list item
        const listItem = window.DOMUtils.createElement('li', { className: 'part-list-item' });
        
        // Create type icon based on part type
        const typeIcon = window.DOMUtils.createElement('div', { 
          className: 'part-type-icon bulk-part-icon',
          title: part.type.charAt(0).toUpperCase() + part.type.slice(1)  // Capitalized type as tooltip
        });
        
        // Set icon image based on part type
        let iconBaseName = part.type;
        
        // Handle special case for PSU (which is stored as 'psu' but file is 'powersupply')
        if (part.type === 'psu') {
          iconBaseName = 'powersupply';
        }
        
        // Check what icons are available and use SVG if it exists based on our file listing
        const isSvg = ['cpu', 'gpu', 'ram', 'storage'].includes(part.type);
        const iconExtension = isSvg ? 'svg' : 'png';
        
        // Set the background image with the appropriate extension
        typeIcon.style.backgroundImage = `url('assets/icons/${iconBaseName}.${iconExtension}')`;
        
        // SVG icons need special handling for color
        if (isSvg) {
          typeIcon.classList.add('svg-icon');
        }
        
        // Add icon to list item
        listItem.appendChild(typeIcon);
        
        // Add the part name
        listItem.appendChild(window.DOMUtils.createElement('span', { className: 'part-name' }, 
          `${part.brand} ${part.model}`));
        
        // Add acquisition date as a pill
        if (part.acquisition_date) {
          const formattedDate = window.DateUtils.formatDateByPrecision(
            part.acquisition_date, 
            part.date_precision
          );
          
          const datePill = window.DOMUtils.createElement('span', { 
            className: 'acquisition-date-pill'
          }, `Acquired: ${formattedDate}`);
          
          listItem.appendChild(datePill);
        }
        
        partsList.appendChild(listItem);
      });
      
      content.appendChild(window.DOMUtils.createElement('div', {
        className: 'form-group'
      }, [
        window.DOMUtils.createElement('label', {}, 'Parts to connect:'),
        partsList
      ]));
      
      // Date info
      let defaultDateInfo = null;
      
      if (allPartsHaveSameAcquisitionDate && commonAcquisitionDate) {
        // Parse the common acquisition date
        const part = partsToConnect[0]; // All have same date, so use first part's precision
        const dateParts = commonAcquisitionDate.split('-');
        
        defaultDateInfo = {
          year: parseInt(dateParts[0]),
          month: (dateParts.length > 1 && part.date_precision !== 'year') ? parseInt(dateParts[1]) : null,
          day: (dateParts.length > 2 && part.date_precision === 'day') ? parseInt(dateParts[2]) : null,
          precision: part.date_precision
        };
        
        // Show info text about default date
        const formattedDate = window.DateUtils.formatDateByPrecision(
          commonAcquisitionDate, 
          part.date_precision
        );
        
        content.appendChild(window.DOMUtils.createElement('p', {}, 
          `If no date is specified, the common acquisition date (${formattedDate}) will be used as the connection date.`));
      } else {
        // Parts have different acquisition dates
        content.appendChild(window.DOMUtils.createElement('p', {}, 
          `If no date is specified, each part will use its own acquisition date as the connection date.`));
      }
      
      // Create motherboard selection
      const motherboardSelect = window.DOMUtils.createElement('select', { id: 'bulk-connect-motherboard', className: 'form-control' });
      
      // Add options
      activeRigs.forEach(rig => {
        const option = window.DOMUtils.createElement('option', { value: rig.id }, 
          `${rig.brand} ${rig.model}${rig.rig_name ? ` (${rig.rig_name})` : ''}`);
        motherboardSelect.appendChild(option);
      });
      
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'bulk-connect-motherboard' }, 'Motherboard:'),
        motherboardSelect
      ]));
      
      // Create a conflict warning section (initially hidden)
      const conflictWarning = window.DOMUtils.createElement('div', { 
        id: 'bulk-conflict-warning',
        className: 'conflict-warning hidden'
      });
      
      content.appendChild(conflictWarning);
      
      // Function to check for conflicts when a motherboard is selected
      const checkForConflicts = () => {
        // Get the selected motherboard ID
        const motherboardId = parseInt(motherboardSelect.value);
        if (!motherboardId) return;
        
        // Check for parts of the same type already connected to this motherboard
        const activeConnections = window.ConnectionModel.getActiveConnectionsForMotherboard(motherboardId);
        
        // Group parts to connect by type
        const partsByType = {};
        
        partsToConnect.forEach(part => {
          if (!partsByType[part.type]) {
            partsByType[part.type] = [];
          }
          partsByType[part.type].push(part);
        });
        
        // Check for conflicts
        const conflictingTypes = [];
        
        for (const type in partsByType) {
          const existingParts = activeConnections.filter(conn => conn.part_type === type);
          if (existingParts.length > 0) {
            conflictingTypes.push({
              type,
              newParts: partsByType[type],
              existingParts
            });
          }
        }
        
        // Clear previous warning
        conflictWarning.innerHTML = '';
        
        // If there are conflicts, show warning
        if (conflictingTypes.length > 0) {
          // Show the warning
          conflictWarning.classList.remove('hidden');
          
          // Add warning header
          conflictWarning.appendChild(window.DOMUtils.createElement('h3', {
            className: 'conflict-header'
          }, 'Conflicts Detected'));
          
          // Add warning message
          conflictWarning.appendChild(window.DOMUtils.createElement('p', {}, 
            `This motherboard already has components that will conflict with the parts you're connecting:`));
          
          // Create a list of conflicts with per-type checkboxes
          const conflictsList = window.DOMUtils.createElement('div', { className: 'conflicts-list' });
          
          conflictingTypes.forEach(conflict => {
            const conflictSection = window.DOMUtils.createElement('div', { 
              className: 'conflict-section',
              dataset: { partType: conflict.type }
            });
            
            // Add header for this part type
            conflictSection.appendChild(window.DOMUtils.createElement('h4', {}, 
              `${conflict.type.charAt(0).toUpperCase() + conflict.type.slice(1)} Conflict`));
            
            // Show existing parts
            conflictSection.appendChild(window.DOMUtils.createElement('p', {}, 
              `${conflict.existingParts.length} existing ${conflict.existingParts.length > 1 ? 'parts' : 'part'}:`));
            
            const existingPartsList = window.DOMUtils.createElement('ul', { className: 'existing-parts-list' });
            conflict.existingParts.forEach(conn => {
              const listItem = window.DOMUtils.createElement('li', {});
            
              // Create type icon
              const typeIcon = window.DOMUtils.createElement('div', { 
                className: 'part-type-icon bulk-part-icon',
                title: conflict.type.charAt(0).toUpperCase() + conflict.type.slice(1)
              });
              
              // Set icon image based on part type
              let iconBaseName = conflict.type;
              
              // Handle special case for PSU (which is stored as 'psu' but file is 'powersupply')
              if (conflict.type === 'psu') {
                iconBaseName = 'powersupply';
              }
              
              // Check what icons are available and use SVG if it exists based on our file listing
              const isSvg = ['cpu', 'gpu', 'ram', 'storage'].includes(conflict.type);
              const iconExtension = isSvg ? 'svg' : 'png';
              
              // Set the background image with the appropriate extension
              typeIcon.style.backgroundImage = `url('assets/icons/${iconBaseName}.${iconExtension}')`;
              
              // SVG icons need special handling for color
              if (isSvg) {
                typeIcon.classList.add('svg-icon');
              }
              
              // Add icon to list item
              listItem.appendChild(typeIcon);
              
              // Add part name
              listItem.appendChild(window.DOMUtils.createElement('span', { className: 'part-name' }, 
                `${conn.part_brand} ${conn.part_model}`));
              
              existingPartsList.appendChild(listItem);
            });
            conflictSection.appendChild(existingPartsList);
            
            // Show new parts being connected
            conflictSection.appendChild(window.DOMUtils.createElement('p', {}, 
              `${conflict.newParts.length} new ${conflict.newParts.length > 1 ? 'parts' : 'part'} to connect:`));
            
            const newPartsList = window.DOMUtils.createElement('ul', { className: 'new-parts-list' });
            conflict.newParts.forEach(part => {
              const listItem = window.DOMUtils.createElement('li', {});
            
              // Create type icon
              const typeIcon = window.DOMUtils.createElement('div', { 
                className: 'part-type-icon bulk-part-icon',
                title: conflict.type.charAt(0).toUpperCase() + conflict.type.slice(1)
              });
              
              // Set icon image based on part type
              let iconBaseName = conflict.type;
              
              // Handle special case for PSU (which is stored as 'psu' but file is 'powersupply')
              if (conflict.type === 'psu') {
                iconBaseName = 'powersupply';
              }
              
              // Check what icons are available and use SVG if it exists based on our file listing
              const isSvg = ['cpu', 'gpu', 'ram', 'storage'].includes(conflict.type);
              const iconExtension = isSvg ? 'svg' : 'png';
              
              // Set the background image with the appropriate extension
              typeIcon.style.backgroundImage = `url('assets/icons/${iconBaseName}.${iconExtension}')`;
              
              // SVG icons need special handling for color
              if (isSvg) {
                typeIcon.classList.add('svg-icon');
              }
              
              // Add icon to list item
              listItem.appendChild(typeIcon);
              
              // Add part name
              listItem.appendChild(window.DOMUtils.createElement('span', { className: 'part-name' }, 
                `${part.brand} ${part.model}`));
              
              newPartsList.appendChild(listItem);
            });
            conflictSection.appendChild(newPartsList);
            
            // Add checkbox for keeping existing parts of this type
            const checkboxContainer = window.DOMUtils.createElement('div', { className: 'form-group' });
            
            const keepExistingCheckbox = window.DOMUtils.createElement('input', {
              type: 'checkbox',
              id: `keep-existing-${conflict.type}`,
              name: `keep-existing-${conflict.type}`,
              className: 'keep-existing-checkbox',
              dataset: { partType: conflict.type }
            });
            
            const checkboxLabel = window.DOMUtils.createElement('label', {
              for: `keep-existing-${conflict.type}`
            }, `Keep existing ${conflict.type}${conflict.existingParts.length > 1 ? 's' : ''} connected (unusual configuration)`);
            
            checkboxContainer.appendChild(keepExistingCheckbox);
            checkboxContainer.appendChild(checkboxLabel);
            
            conflictSection.appendChild(checkboxContainer);
            
            // Add explanation
            conflictSection.appendChild(window.DOMUtils.createElement('p', { className: 'conflict-info' }, 
              `If not checked, existing ${conflict.type}${conflict.existingParts.length > 1 ? 's' : ''} will be automatically disconnected when the new ${conflict.type}${conflict.newParts.length > 1 ? 's are' : ' is'} connected.`));
            
            conflictsList.appendChild(conflictSection);
          });
          
          conflictWarning.appendChild(conflictsList);
        } else {
          // Hide the warning if no conflicts
          conflictWarning.classList.add('hidden');
        }
      };
      
      // Add event listener to the motherboard select to check for conflicts
      motherboardSelect.addEventListener('change', checkForConflicts);
      
      // Check for conflicts immediately if there's only one motherboard
      if (activeRigs.length === 1) {
        setTimeout(checkForConflicts, 0);
      }
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Connection Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'bulk-connect-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Use acquisition dates'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'bulk-connect-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'bulk-connect-day' });
      daySelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Day (optional)'));
      
      // Populate year select
      window.DateUtils.populateYearSelect(yearSelect);
      
      // Update days when month changes
      monthSelect.addEventListener('change', () => {
        const year = parseInt(yearSelect.value) || new Date().getFullYear();
        const month = parseInt(monthSelect.value) || null;
        window.DateUtils.populateDaySelect(daySelect, month, year);
      });
      
      yearSelect.addEventListener('change', () => {
        if (monthSelect.value) {
          const year = parseInt(yearSelect.value) || new Date().getFullYear();
          const month = parseInt(monthSelect.value) || null;
          window.DateUtils.populateDaySelect(daySelect, month, year);
        }
      });
      
      dateControls.appendChild(yearSelect);
      dateControls.appendChild(monthSelect);
      dateControls.appendChild(daySelect);
      
      dateSection.appendChild(dateControls);
      content.appendChild(dateSection);
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'bulk-connect-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'bulk-connect-notes', rows: 3 })
      ]));
      
      // Connect button
      const connectButton = window.DOMUtils.createButton('Connect All Parts', 'primary-button', async () => {
        const motherboardId = parseInt(motherboardSelect.value);
        let year = parseInt(yearSelect.value);
        let month = monthSelect.value ? parseInt(monthSelect.value) : null;
        let day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('bulk-connect-notes').value.trim();
        
        if (!motherboardId) {
          alert('Please select a motherboard');
          return;
        }
        
        // Create date info object (null if no year provided to use acquisition dates)
        let dateInfo = null;
        
        // If a specific date was provided, use it
        if (year) {
          dateInfo = { year, month, day };
        }
        // Otherwise, the model will use each part's acquisition date
        
        try {
          let successCount = 0;
          
          // Get parts grouped by type
          const partsByType = {};
          
          partsToConnect.forEach(part => {
            if (!partsByType[part.type]) {
              partsByType[part.type] = [];
            }
            partsByType[part.type].push(part);
          });
          
          // Create a map of part types to keep
          const keepExistingMap = {};
          
          // Get values from checkboxes if they exist
          document.querySelectorAll('.keep-existing-checkbox').forEach(checkbox => {
            const partType = checkbox.dataset.partType;
            keepExistingMap[partType] = checkbox.checked;
          });
          
          // Connect all parts with appropriate keep setting for each type
          for (const partId of partIds) {
            try {
              // Find the part to get its type
              const part = partsToConnect.find(p => p.id === partId);
              if (!part) continue;
              
              // Get the keep setting for this part type
              const keepExisting = keepExistingMap[part.type] || false;
              
              // Connect the part with the appropriate keepExisting value
              window.ConnectionModel.connectPart(partId, motherboardId, dateInfo, notes, keepExisting);
              successCount++;
            } catch (err) {
              console.error(`Error connecting part ${partId}:`, err);
            }
          }
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          await window.App.saveDatabase();
          
          // Refresh all affected views
          window.PartsList.refresh();
          
          // Also refresh the rigs view to update rig status
          if (window.RigsView && typeof window.RigsView.refresh === 'function') {
            window.RigsView.refresh();
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast(`${successCount} parts connected successfully`, 'success');
        } catch (err) {
          console.error('Error during bulk connect operation:', err);
          alert('Error connecting parts: ' + err.message);
        }
      });
      
      content.appendChild(connectButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Connect Multiple Parts', content);
    } catch (err) {
      console.error('Error showing bulk connect options:', err);
      alert('Error: ' + err.message);
    }
  }
  
  /**
   * Show form for disconnecting multiple parts at once
   * @param {Array} partIds - Array of part IDs to disconnect
   */
  function showBulkDisconnectForm(partIds) {
    if (!partIds || partIds.length === 0) {
      return;
    }
    
    try {
      // Verify that all parts can be disconnected
      const partsToDisconnect = [];
      
      for (const partId of partIds) {
        // Get active connections for the part
        const activeConnections = window.ConnectionModel.getActiveConnectionsForPart(partId);
        
        if (activeConnections.length === 0) {
          const part = window.PartModel.getPartById(partId);
          if (part) {
            throw new Error(`Part ${part.brand} ${part.model} is not connected to any motherboard`);
          } else {
            throw new Error(`Part with ID ${partId} is not connected to any motherboard`);
          }
        }
        
        // Get the connection details
        partsToDisconnect.push({
          partId,
          connection: activeConnections[0]
        });
      }
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      content.appendChild(window.DOMUtils.createElement('p', {}, `You are about to disconnect ${partIds.length} parts. All parts will share the same disconnection date and notes.`));
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Disconnection Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'bulk-disconnect-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'bulk-disconnect-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'bulk-disconnect-day' });
      daySelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Day (optional)'));
      
      // Populate year select
      window.DateUtils.populateYearSelect(yearSelect);
      
      // Update days when month changes
      monthSelect.addEventListener('change', () => {
        const year = parseInt(yearSelect.value) || new Date().getFullYear();
        const month = parseInt(monthSelect.value) || null;
        window.DateUtils.populateDaySelect(daySelect, month, year);
      });
      
      yearSelect.addEventListener('change', () => {
        if (monthSelect.value) {
          const year = parseInt(yearSelect.value) || new Date().getFullYear();
          const month = parseInt(monthSelect.value) || null;
          window.DateUtils.populateDaySelect(daySelect, month, year);
        }
      });
      
      dateControls.appendChild(yearSelect);
      dateControls.appendChild(monthSelect);
      dateControls.appendChild(daySelect);
      
      dateSection.appendChild(dateControls);
      content.appendChild(dateSection);
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'bulk-disconnect-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'bulk-disconnect-notes', rows: 3 })
      ]));
      
      // Disconnect button
      const disconnectButton = window.DOMUtils.createButton('Disconnect All Parts', 'disconnect-btn', async () => {
        const year = parseInt(yearSelect.value);
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('bulk-disconnect-notes').value.trim();
        
        if (!year) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        try {
          let successCount = 0;
          
          // Disconnect all parts
          for (const { partId } of partsToDisconnect) {
            try {
              window.ConnectionModel.disconnectPartById(partId, dateInfo, notes);
              successCount++;
            } catch (err) {
              console.error(`Error disconnecting part ${partId}:`, err);
            }
          }
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          await window.App.saveDatabase();
          
          // Refresh all affected views
          window.PartsList.refresh();
          
          // Also refresh the rigs view to update rig status
          if (window.RigsView && typeof window.RigsView.refresh === 'function') {
            window.RigsView.refresh();
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast(`${successCount} parts disconnected successfully`, 'success');
        } catch (err) {
          console.error('Error during bulk disconnect operation:', err);
          alert('Error disconnecting parts: ' + err.message);
        }
      });
      
      content.appendChild(disconnectButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Disconnect Multiple Parts', content);
    } catch (err) {
      console.error('Error showing bulk disconnect options:', err);
      alert('Error: ' + err.message);
    }
  }
  
  // Public API
  return {
    showConnectOptions,
    showDisconnectOptions,
    showBulkConnectForm,
    showBulkDisconnectForm
  };
})();