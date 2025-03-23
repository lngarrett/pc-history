/**
 * Disposal Controller for PC History Tracker
 * Handles disposing of parts
 */

// Create namespace
window.DisposalController = (function() {
  // Private members
  
  /**
   * Show form for disposing a part
   * @param {number} partId - Part ID
   */
  function showDisposePartForm(partId) {
    try {
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      content.appendChild(window.DOMUtils.createElement('p', {}, 'Record the disposal of this part:'));
      
      // Disposal reason
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'dispose-reason' }, 'Disposal Reason:'),
        window.DOMUtils.createElement('select', { id: 'dispose-reason' }, [
          window.DOMUtils.createElement('option', { value: 'Sold' }, 'Sold'),
          window.DOMUtils.createElement('option', { value: 'Given Away' }, 'Given Away'),
          window.DOMUtils.createElement('option', { value: 'Recycled' }, 'Recycled'),
          window.DOMUtils.createElement('option', { value: 'Broken' }, 'Broken/Non-functional'),
          window.DOMUtils.createElement('option', { value: 'Lost' }, 'Lost'),
          window.DOMUtils.createElement('option', { value: 'Other' }, 'Other')
        ])
      ]));
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Disposal Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'dispose-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'dispose-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'dispose-day' });
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
        window.DOMUtils.createElement('label', { for: 'dispose-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'dispose-notes', rows: 3 })
      ]));
      
      // Warning
      content.appendChild(window.DOMUtils.createElement('p', { className: 'warning' }, 
        'Note: This will disconnect the part from any motherboard it is connected to.'));
      
      // Dispose button
      const disposeButton = window.DOMUtils.createButton('Record Disposal', 'delete-btn', () => {
        const reason = document.getElementById('dispose-reason').value;
        const year = parseInt(yearSelect.value);
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('dispose-notes').value.trim();
        
        if (!reason) {
          alert('Please select a disposal reason');
          return;
        }
        
        if (!year) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        try {
          // Dispose the part
          window.DisposalModel.disposePart(partId, dateInfo, reason, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh views
          window.PartsList.refresh();
          
          // If timeline is open, go back to parts list
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.hideTimelineView();
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part disposal recorded', 'success');
        } catch (err) {
          console.error('Error disposing part:', err);
          alert('Error disposing part: ' + err.message);
        }
      });
      
      content.appendChild(disposeButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Dispose Part', content);
    } catch (err) {
      console.error('Error showing dispose part form:', err);
      alert('Error showing dispose part form: ' + err.message);
    }
  }

  /**
   * Show form for restoring a disposed part
   * @param {number} partId - Part ID
   */
  function showRestorePartForm(partId) {
    try {
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      content.appendChild(window.DOMUtils.createElement('p', {}, 'Are you sure you want to restore this part? This will remove its disposal record.'));
      
      // Restore button
      const restoreButton = window.DOMUtils.createButton('Restore Part', 'restore-btn', () => {
        try {
          // Restore the part
          window.DisposalModel.restoreDisposedPart(partId);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh views
          window.PartsList.refresh();
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part restored successfully', 'success');
        } catch (err) {
          console.error('Error restoring part:', err);
          alert('Error restoring part: ' + err.message);
        }
      });
      
      // Cancel button
      const cancelButton = window.DOMUtils.createButton('Cancel', 'neutral-button', () => {
        document.body.removeChild(modal);
      });
      
      const buttonContainer = window.DOMUtils.createElement('div', { className: 'button-group' });
      buttonContainer.appendChild(restoreButton);
      buttonContainer.appendChild(cancelButton);
      
      content.appendChild(buttonContainer);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Restore Part', content);
    } catch (err) {
      console.error('Error showing restore part form:', err);
      alert('Error showing restore part form: ' + err.message);
    }
  }

  // Public API
  return {
    showDisposePartForm,
    showRestorePartForm
  };
})();