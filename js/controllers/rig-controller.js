/**
 * Rig Controller for PC History Tracker
 * Handles rig management user interface
 */

// Create namespace
window.RigController = (function() {
  // Private members
  
  /**
   * Show the rig add form
   * @param {number} motherboardId - Motherboard ID
   */
  function showRigAddForm(motherboardId) {
    try {
      // Get motherboard data
      const motherboard = window.PartModel.getPartById(motherboardId);
      if (!motherboard) {
        throw new Error('Motherboard not found');
      }
      
      // Create form content
      const content = window.DOMUtils.createElement('div', { className: 'rig-form' });
      
      // Info text
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        `Add an identity to ${motherboard.brand} ${motherboard.model}`));
      
      // Name input
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'rig-name' }, 'Rig Name:'),
        window.DOMUtils.createElement('input', { 
          type: 'text', 
          id: 'rig-name', 
          className: 'form-control', 
          required: true
        })
      ]));
      
      // Start date
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Active From:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'rig-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'rig-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'rig-day' });
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
        window.DOMUtils.createElement('label', { for: 'rig-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'rig-notes', rows: 3, className: 'form-control' })
      ]));
      
      // Submit button
      const submitButton = window.DOMUtils.createButton('Add Rig', 'primary-button', () => {
        const name = document.getElementById('rig-name').value.trim();
        const year = parseInt(yearSelect.value);
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('rig-notes').value.trim();
        
        // Validate
        if (!name) {
          alert('Please enter a rig name');
          return;
        }
        
        if (!year) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        try {
          // Add rig using model
          window.RigModel.addRig(motherboardId, name, dateInfo, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh parts list
          window.PartsList.refresh();
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(motherboardId);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Rig added successfully', 'success');
        } catch (err) {
          console.error('Error adding rig:', err);
          alert('Error adding rig: ' + err.message);
        }
      });
      
      content.appendChild(submitButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Add Rig Identity', content);
    } catch (err) {
      console.error('Error showing add rig form:', err);
      alert('Error showing add rig form: ' + err.message);
    }
  }
  
  /**
   * Show the rig edit form
   * @param {number} rigId - Rig ID
   */
  function showRigEditForm(rigId) {
    try {
      // Get rig data
      const rig = window.RigModel.getRigById(rigId);
      if (!rig) {
        throw new Error('Rig not found');
      }
      
      // Create form content
      const content = window.DOMUtils.createElement('div', { className: 'rig-form' });
      
      // Name input
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'rig-name' }, 'Rig Name:'),
        window.DOMUtils.createElement('input', { 
          type: 'text', 
          id: 'rig-name', 
          className: 'form-control', 
          value: rig.name,
          required: true
        })
      ]));
      
      // Parse date parts for active_from
      let year = null;
      let month = null;
      let day = null;
      
      if (rig.active_from) {
        const date = new Date(rig.active_from);
        year = date.getFullYear();
        
        if (rig.date_precision !== 'year') {
          month = date.getMonth() + 1;
        }
        
        if (rig.date_precision === 'day') {
          day = date.getDate();
        }
      }
      
      // Start date
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Active From:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'rig-year', required: true });
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'rig-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const option = window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]);
        if (i === month) {
          option.selected = true;
        }
        monthSelect.appendChild(option);
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'rig-day' });
      daySelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Day (optional)'));
      
      // Populate year select
      window.DateUtils.populateYearSelect(yearSelect, year);
      
      // Populate days if month is set
      if (month) {
        window.DateUtils.populateDaySelect(daySelect, month, year, day);
      }
      
      // Update days when month changes
      monthSelect.addEventListener('change', () => {
        const selectedYear = parseInt(yearSelect.value) || new Date().getFullYear();
        const selectedMonth = parseInt(monthSelect.value) || null;
        window.DateUtils.populateDaySelect(daySelect, selectedMonth, selectedYear);
      });
      
      yearSelect.addEventListener('change', () => {
        if (monthSelect.value) {
          const selectedYear = parseInt(yearSelect.value) || new Date().getFullYear();
          const selectedMonth = parseInt(monthSelect.value) || null;
          window.DateUtils.populateDaySelect(daySelect, selectedMonth, selectedYear);
        }
      });
      
      dateControls.appendChild(yearSelect);
      dateControls.appendChild(monthSelect);
      dateControls.appendChild(daySelect);
      
      dateSection.appendChild(dateControls);
      content.appendChild(dateSection);
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'rig-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { 
          id: 'rig-notes', 
          rows: 3, 
          className: 'form-control' 
        }, rig.notes || '')
      ]));
      
      // Submit button
      const submitButton = window.DOMUtils.createButton('Update Rig', 'primary-button', () => {
        const name = document.getElementById('rig-name').value.trim();
        const selectedYear = parseInt(yearSelect.value);
        const selectedMonth = monthSelect.value ? parseInt(monthSelect.value) : null;
        const selectedDay = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('rig-notes').value.trim();
        
        // Validate
        if (!name) {
          alert('Please enter a rig name');
          return;
        }
        
        if (!selectedYear) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year: selectedYear, month: selectedMonth, day: selectedDay };
        
        try {
          // Update rig using model
          window.RigModel.updateRig(rigId, name, dateInfo, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh parts list
          window.PartsList.refresh();
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(rig.motherboard_id);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Rig updated successfully', 'success');
        } catch (err) {
          console.error('Error updating rig:', err);
          alert('Error updating rig: ' + err.message);
        }
      });
      
      content.appendChild(submitButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Edit Rig Identity', content);
    } catch (err) {
      console.error('Error showing edit rig form:', err);
      alert('Error showing edit rig form: ' + err.message);
    }
  }
  
  /**
   * Show the rig deactivation form
   * @param {number} rigId - Rig ID
   */
  function showRigDeactivationForm(rigId) {
    try {
      // Get rig data
      const rig = window.RigModel.getRigById(rigId);
      if (!rig) {
        throw new Error('Rig not found');
      }
      
      // Create form content
      const content = window.DOMUtils.createElement('div');
      
      // Info text
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        `Deactivate rig "${rig.name}"?`));
      
      // End date
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Active Until:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'rig-end-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'rig-end-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'rig-end-day' });
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
        window.DOMUtils.createElement('label', { for: 'rig-deactivate-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'rig-deactivate-notes', rows: 3 })
      ]));
      
      // Deactivate button
      const deactivateButton = window.DOMUtils.createButton('Deactivate Rig', 'danger-button', () => {
        const year = parseInt(yearSelect.value);
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('rig-deactivate-notes').value.trim();
        
        // Validate
        if (!year) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        try {
          // Deactivate rig using model
          window.RigModel.deactivateRig(rigId, dateInfo, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh parts list
          window.PartsList.refresh();
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(rig.motherboard_id);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Rig deactivated successfully', 'success');
        } catch (err) {
          console.error('Error deactivating rig:', err);
          alert('Error deactivating rig: ' + err.message);
        }
      });
      
      content.appendChild(deactivateButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Deactivate Rig', content);
    } catch (err) {
      console.error('Error showing rig deactivation form:', err);
      alert('Error showing rig deactivation form: ' + err.message);
    }
  }
  
  // Public API
  return {
    showRigAddForm,
    showRigEditForm,
    showRigDeactivationForm
  };
})();