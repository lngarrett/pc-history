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
      
      // Compute rig lifecycles to get the active one
      const lifecycles = window.RigModel.computeRigLifecycles(motherboardId);
      const activeLifecycle = lifecycles.find(cycle => cycle.active);
      
      if (!activeLifecycle) {
        throw new Error('No active rig lifecycle found for this motherboard');
      }
      
      // Create form content
      const content = window.DOMUtils.createElement('div', { className: 'rig-form' });
      
      // Info text
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        `Add a name to ${motherboard.brand} ${motherboard.model}`));
      
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
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'rig-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'rig-notes', rows: 3, className: 'form-control' })
      ]));
      
      // Submit button
      const submitButton = window.DOMUtils.createButton('Name Rig', 'primary-button', () => {
        const name = document.getElementById('rig-name').value.trim();
        const notes = document.getElementById('rig-notes').value.trim();
        
        // Validate
        if (!name) {
          alert('Please enter a rig name');
          return;
        }
        
        try {
          // Add rig name using the new model function
          window.RigModel.setRigName(motherboardId, activeLifecycle.start_date, name, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh all affected views
          window.PartsList.refresh();
          
          // Also refresh the rigs view
          if (window.RigsView && typeof window.RigsView.refresh === 'function') {
            window.RigsView.refresh();
          }
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(motherboardId);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Rig named successfully', 'success');
        } catch (err) {
          console.error('Error naming rig:', err);
          alert('Error naming rig: ' + err.message);
        }
      });
      
      content.appendChild(submitButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Name Rig', content);
    } catch (err) {
      console.error('Error showing rig name form:', err);
      alert('Error showing rig name form: ' + err.message);
    }
  }
  
  /**
   * Show the rig edit form
   * @param {number} rigId - Rig ID (this is actually a rig identity ID)
   */
  function showRigEditForm(rigId) {
    try {
      // Get rig data to find the motherboard_id
      const rig = window.RigModel.getRigById(rigId);
      if (!rig) {
        throw new Error('Rig not found');
      }
      
      // Compute lifecycles to get the right one
      const lifecycles = window.RigModel.computeRigLifecycles(rig.motherboard_id);
      
      // Try to find the active lifecycle or one that matches the identity's active_from
      let targetLifecycle = lifecycles.find(cycle => cycle.active);
      
      // If no active lifecycle, see if we can match by start date
      if (!targetLifecycle && rig.active_from) {
        // Get just the date part for comparison (ignoring time)
        const rigStartDate = rig.active_from.split('T')[0];
        targetLifecycle = lifecycles.find(cycle => 
          cycle.start_date.split('T')[0] === rigStartDate);
      }
      
      if (!targetLifecycle) {
        throw new Error('No matching rig lifecycle found');
      }
      
      // Look for an existing name for this lifecycle
      let existingRigName = window.RigModel.getRigName(rig.motherboard_id, targetLifecycle.start_date);
      
      // Create form content
      const content = window.DOMUtils.createElement('div', { className: 'rig-form' });
      
      // Name input
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'rig-name' }, 'Rig Name:'),
        window.DOMUtils.createElement('input', { 
          type: 'text', 
          id: 'rig-name', 
          className: 'form-control', 
          value: existingRigName ? existingRigName.name : rig.rig_name,
          required: true
        })
      ]));
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'rig-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { 
          id: 'rig-notes', 
          rows: 3, 
          className: 'form-control' 
        }, existingRigName ? existingRigName.notes : (rig.notes || ''))
      ]));
      
      // Submit button
      const submitButton = window.DOMUtils.createButton('Update Rig Name', 'primary-button', () => {
        const name = document.getElementById('rig-name').value.trim();
        const notes = document.getElementById('rig-notes').value.trim();
        
        // Validate
        if (!name) {
          alert('Please enter a rig name');
          return;
        }
        
        try {
          // Update rig name using the new model function
          window.RigModel.setRigName(rig.motherboard_id, targetLifecycle.start_date, name, notes);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh all affected views
          window.PartsList.refresh();
          
          // Also refresh the rigs view
          if (window.RigsView && typeof window.RigsView.refresh === 'function') {
            window.RigsView.refresh();
          }
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(rig.motherboard_id);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Rig name updated successfully', 'success');
        } catch (err) {
          console.error('Error updating rig name:', err);
          alert('Error updating rig name: ' + err.message);
        }
      });
      
      content.appendChild(submitButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Edit Rig Name', content);
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
      // Get rig data to find the motherboard_id
      const rig = window.RigModel.getRigById(rigId);
      if (!rig) {
        throw new Error('Rig not found');
      }
      
      // Get the active lifecycle
      const lifecycles = window.RigModel.computeRigLifecycles(rig.motherboard_id);
      const activeLifecycle = lifecycles.find(cycle => cycle.active);
      
      if (!activeLifecycle) {
        throw new Error('No active rig lifecycle found');
      }
      
      // Get the rig name for the active lifecycle
      const rigName = window.RigModel.getRigName(rig.motherboard_id, activeLifecycle.start_date);
      const displayName = rigName ? rigName.name : rig.rig_name || `${rig.brand} ${rig.model}`;
      
      // Create form content
      const content = window.DOMUtils.createElement('div');
      
      // Info text
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        `You are about to disconnect all parts from "${displayName}". This will deactivate the rig.`));
      
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        'To deactivate this rig, you will need to disconnect all parts from the motherboard.'));
      
      content.appendChild(window.DOMUtils.createElement('p', { className: 'warning-text' }, 
        'This action will affect all connected parts and cannot be undone.'));
      
      // Notes for the action
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'rig-deactivate-notes' }, 'Deactivation Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'rig-deactivate-notes', rows: 3, placeholder: 'Optional notes about why you are deactivating this rig' })
      ]));
      
      // Create button container for options
      const buttonContainer = window.DOMUtils.createElement('div', { className: 'button-group' });
      
      // Cancel button 
      const cancelButton = window.DOMUtils.createButton('Cancel', 'secondary-button', () => {
        document.body.removeChild(modal);
      });
      
      // View parts button
      const viewPartsButton = window.DOMUtils.createButton('View Connected Parts', 'info-button', () => {
        // Navigate to parts tab and filter for this motherboard
        // This is a placeholder - implement proper navigation if needed
        document.getElementById('tab-parts').click();
        // Close the modal
        document.body.removeChild(modal);
      });
      
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(viewPartsButton);
      content.appendChild(buttonContainer);
      
      // Show modal - we don't include direct deactivation since the user needs to disconnect parts
      const modal = window.DOMUtils.showModal('Deactivate Rig', content);
    } catch (err) {
      console.error('Error showing rig deactivation info:', err);
      alert('Error showing rig deactivation info: ' + err.message);
    }
  }
  
  /**
   * Show admin functions for rig management
   */
  function showRigAdminFunctions() {
    try {
      // Create form content
      const content = window.DOMUtils.createElement('div');
      
      // Info text
      content.appendChild(window.DOMUtils.createElement('h3', {}, 'Rig Administration'));
      
      content.appendChild(window.DOMUtils.createElement('p', { className: 'warning-text' }, 
        'These functions are for advanced users only. Use with caution.'));
      
      // List of motherboards
      const motherboardsContainer = window.DOMUtils.createElement('div', { className: 'admin-motherboards-list' });
      content.appendChild(motherboardsContainer);
      
      // Get all motherboards
      const db = window.DatabaseService.getDatabase();
      const motherboardsQuery = `
        SELECT id, brand, model 
        FROM parts 
        WHERE type = 'motherboard' AND is_deleted = 0
        ORDER BY brand, model
      `;
      
      const result = db.exec(motherboardsQuery);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const motherboards = result[0].values.map(row => {
          const mb = {};
          columns.forEach((column, index) => {
            mb[column] = row[index];
          });
          return mb;
        });
        
        // Section for purging rig names
        const purgeSection = window.DOMUtils.createElement('div', { className: 'admin-section' });
        purgeSection.appendChild(window.DOMUtils.createElement('h4', {}, 'Purge Rig Names'));
        
        purgeSection.appendChild(window.DOMUtils.createElement('p', {}, 
          'Select a motherboard to purge all its associated rig names. This cannot be undone.'));
        
        // Create a select element for motherboards
        const mbSelect = window.DOMUtils.createElement('select', { id: 'admin-motherboard-select' });
        mbSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Select a motherboard...'));
        
        motherboards.forEach(mb => {
          mbSelect.appendChild(window.DOMUtils.createElement('option', { value: mb.id }, 
            `${mb.brand} ${mb.model}`));
        });
        
        purgeSection.appendChild(mbSelect);
        
        // Purge button
        const purgeButton = window.DOMUtils.createButton('Purge Rig Names', 'danger-button', () => {
          const motherboardId = mbSelect.value;
          if (!motherboardId) {
            alert('Please select a motherboard');
            return;
          }
          
          // Confirm
          if (confirm(`Are you sure you want to delete ALL rig names for ${mbSelect.options[mbSelect.selectedIndex].text}?`)) {
            try {
              // Purge rig names
              window.RigModel.deleteAllRigNames(motherboardId);
              
              // Update state
              window.App.hasUnsavedChanges = true;
              window.App.updateSaveStatus();
              
              // Auto-save
              window.App.saveDatabase();
              
              // Refresh parts list
              window.PartsList.refresh();
              
              window.DOMUtils.showToast('Rig names purged successfully', 'success');
            } catch (err) {
              console.error('Error purging rig names:', err);
              alert('Error purging rig names: ' + err.message);
            }
          }
        });
        
        purgeSection.appendChild(purgeButton);
        content.appendChild(purgeSection);
      } else {
        content.appendChild(window.DOMUtils.createElement('p', {}, 'No motherboards found.'));
      }
      
      // Show modal
      const modal = window.DOMUtils.showModal('Rig Administration', content);
    } catch (err) {
      console.error('Error showing rig admin functions:', err);
      alert('Error showing rig admin functions: ' + err.message);
    }
  }
  
  // Public API
  return {
    showRigAddForm,
    showRigEditForm,
    showRigDeactivationForm,
    showRigAdminFunctions
  };
})();