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
      // Get active motherboards
      const activeRigs = window.RigModel.getActiveRigs();
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      if (activeRigs.length === 0) {
        content.appendChild(window.DOMUtils.createElement('p', {}, 'No active motherboards. Add a motherboard first.'));
        window.DOMUtils.showModal('Connect Part', content);
        return;
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
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Connection Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'connect-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
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
        const year = parseInt(yearSelect.value);
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('connect-notes').value.trim();
        
        if (!motherboardId) {
          alert('Please select a motherboard');
          return;
        }
        
        if (!year) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        try {
          // Connect the part
          window.ConnectionModel.connectPart(partId, motherboardId, dateInfo, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh views
          window.PartsList.refresh();
          
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
      const disconnectButton = window.DOMUtils.createButton('Disconnect Part', 'disconnect-btn', () => {
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
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh views
          window.PartsList.refresh();
          
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

  // Public API
  return {
    showConnectOptions,
    showDisconnectOptions
  };
})();