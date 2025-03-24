/**
 * Part Controller for PC History Tracker
 * Handles part management user interface
 */

// Create namespace
window.PartController = (function() {
  // Private members
  
  /**
   * Show the part add form
   */
  function showPartAddForm() {
    try {
      // Create form content
      const content = window.DOMUtils.createElement('div', { className: 'part-form' });
      
      // Brand input
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-brand' }, 'Brand:'),
        window.DOMUtils.createElement('input', { 
          type: 'text', 
          id: 'part-brand', 
          className: 'form-control', 
          required: true,
          list: 'brand-datalist'
        })
      ]));
      
      // Create datalist for brand autocomplete
      const brandDatalist = window.DOMUtils.createElement('datalist', { id: 'brand-datalist' });
      try {
        const brands = window.PartModel.getUniqueBrands();
        brands.forEach(brand => {
          brandDatalist.appendChild(window.DOMUtils.createElement('option', { value: brand }));
        });
      } catch (error) {
        console.error('Error loading brands for autocomplete:', error);
      }
      content.appendChild(brandDatalist);
      
      // Model input
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-model' }, 'Model:'),
        window.DOMUtils.createElement('input', { 
          type: 'text', 
          id: 'part-model', 
          className: 'form-control', 
          required: true 
        })
      ]));
      
      // Type select
      const typeSelect = window.DOMUtils.createElement('select', { 
        id: 'part-type', 
        className: 'form-control', 
        required: true 
      });
      
      // Add options
      const partTypes = [
        { value: '', label: 'Select type...' },
        { value: 'motherboard', label: 'Motherboard' },
        { value: 'cpu', label: 'CPU' },
        { value: 'gpu', label: 'GPU' },
        { value: 'ram', label: 'RAM' },
        { value: 'storage', label: 'Storage' },
        { value: 'psu', label: 'Power Supply' },
        { value: 'case', label: 'Case' },
        { value: 'cooling', label: 'Cooling' },
        { value: 'monitor', label: 'Monitor' },
        { value: 'peripheral', label: 'Peripheral' },
        { value: 'other', label: 'Other' }
      ];
      
      partTypes.forEach(type => {
        typeSelect.appendChild(window.DOMUtils.createElement('option', { value: type.value }, type.label));
      });
      
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-type' }, 'Type:'),
        typeSelect
      ]));
      
      // Acquisition date
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Acquisition Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'part-year' });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year (optional)'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'part-month', disabled: true });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'part-day', disabled: true });
      daySelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Day (optional)'));
      
      // Populate year select
      window.DateUtils.populateYearSelect(yearSelect);
      
      // Enable/disable month select based on year
      yearSelect.addEventListener('change', () => {
        if (yearSelect.value) {
          monthSelect.disabled = false;
        } else {
          monthSelect.disabled = true;
          monthSelect.value = '';
          daySelect.disabled = true;
          daySelect.value = '';
        }
      });
      
      // Update days when month changes and enable/disable day select
      monthSelect.addEventListener('change', () => {
        if (monthSelect.value) {
          daySelect.disabled = false;
          const year = parseInt(yearSelect.value);
          const month = parseInt(monthSelect.value);
          window.DateUtils.populateDaySelect(daySelect, month, year);
        } else {
          daySelect.disabled = true;
          daySelect.value = '';
        }
      });
      
      dateControls.appendChild(yearSelect);
      dateControls.appendChild(monthSelect);
      dateControls.appendChild(daySelect);
      
      dateSection.appendChild(dateControls);
      content.appendChild(dateSection);
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'part-notes', rows: 3, className: 'form-control' })
      ]));
      
      // Submit button
      const submitButton = window.DOMUtils.createButton('Add Part', 'primary-button', () => {
        const brand = document.getElementById('part-brand').value.trim();
        const model = document.getElementById('part-model').value.trim();
        const type = document.getElementById('part-type').value;
        const year = yearSelect.value ? parseInt(yearSelect.value) : null;
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('part-notes').value.trim();
        
        // Validate
        if (!brand) {
          alert('Please enter a brand');
          return;
        }
        
        if (!model) {
          alert('Please enter a model');
          return;
        }
        
        if (!type) {
          alert('Please select a type');
          return;
        }
        
        // Create date precision
        let datePrecision = 'none';
        let acquisitionDate = null;
        
        if (year) {
          if (month) {
            if (day) {
              datePrecision = 'day';
              acquisitionDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            } else {
              datePrecision = 'month';
              acquisitionDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            }
          } else {
            datePrecision = 'year';
            acquisitionDate = `${year}-01-01`;
          }
        }
        
        // Create part object
        const part = {
          brand,
          model,
          type,
          acquisition_date: acquisitionDate,
          date_precision: datePrecision,
          notes
        };
        
        try {
          // Add part using model
          window.PartModel.addPart(part);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh parts list
          window.PartsList.refresh();
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part added successfully', 'success');
        } catch (err) {
          console.error('Error adding part:', err);
          alert('Error adding part: ' + err.message);
        }
      });
      
      content.appendChild(submitButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Add New Part', content);
    } catch (err) {
      console.error('Error showing add part form:', err);
      alert('Error showing add part form: ' + err.message);
    }
  }
  
  /**
   * Show the part edit form
   * @param {number} partId - Part ID
   */
  function showPartEditForm(partId) {
    try {
      // Get part data
      const part = window.PartModel.getPartById(partId);
      if (!part) {
        throw new Error('Part not found');
      }
      
      // Create form content
      const content = window.DOMUtils.createElement('div', { className: 'part-form' });
      
      // Brand input
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-brand' }, 'Brand:'),
        window.DOMUtils.createElement('input', { 
          type: 'text', 
          id: 'part-brand', 
          className: 'form-control', 
          value: part.brand,
          required: true,
          list: 'brand-datalist'
        })
      ]));
      
      // Create datalist for brand autocomplete
      const brandDatalist = window.DOMUtils.createElement('datalist', { id: 'brand-datalist' });
      try {
        const brands = window.PartModel.getUniqueBrands();
        brands.forEach(brand => {
          brandDatalist.appendChild(window.DOMUtils.createElement('option', { value: brand }));
        });
      } catch (error) {
        console.error('Error loading brands for autocomplete:', error);
      }
      content.appendChild(brandDatalist);
      
      // Model input
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-model' }, 'Model:'),
        window.DOMUtils.createElement('input', { 
          type: 'text', 
          id: 'part-model', 
          className: 'form-control', 
          value: part.model,
          required: true 
        })
      ]));
      
      // Type select
      const typeSelect = window.DOMUtils.createElement('select', { 
        id: 'part-type', 
        className: 'form-control', 
        required: true 
      });
      
      // Add options
      const partTypes = [
        { value: 'motherboard', label: 'Motherboard' },
        { value: 'cpu', label: 'CPU' },
        { value: 'gpu', label: 'GPU' },
        { value: 'ram', label: 'RAM' },
        { value: 'storage', label: 'Storage' },
        { value: 'psu', label: 'Power Supply' },
        { value: 'case', label: 'Case' },
        { value: 'cooling', label: 'Cooling' },
        { value: 'monitor', label: 'Monitor' },
        { value: 'peripheral', label: 'Peripheral' },
        { value: 'other', label: 'Other' }
      ];
      
      partTypes.forEach(type => {
        const option = window.DOMUtils.createElement('option', { value: type.value }, type.label);
        if (type.value === part.type) {
          option.selected = true;
        }
        typeSelect.appendChild(option);
      });
      
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-type' }, 'Type:'),
        typeSelect
      ]));
      
      // Acquisition date
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Acquisition Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Parse date parts
      let year = null;
      let month = null;
      let day = null;
      
      if (part.acquisition_date) {
        const date = new Date(part.acquisition_date);
        year = date.getFullYear();
        
        if (part.date_precision !== 'year') {
          month = date.getMonth() + 1;
        }
        
        if (part.date_precision === 'day') {
          day = date.getDate();
        }
      }
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'part-year' });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year (optional)'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'part-month' });
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
      const daySelect = window.DOMUtils.createElement('select', { id: 'part-day' });
      daySelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Day (optional)'));
      
      // Populate year select
      window.DateUtils.populateYearSelect(yearSelect, year);
      
      // Populate days if month is set
      if (month) {
        window.DateUtils.populateDaySelect(daySelect, month, year, day);
      }
      
      // Set disabled state based on values
      monthSelect.disabled = !year;
      daySelect.disabled = !month;
      
      // Enable/disable month select based on year
      yearSelect.addEventListener('change', () => {
        if (yearSelect.value) {
          monthSelect.disabled = false;
        } else {
          monthSelect.disabled = true;
          monthSelect.value = '';
          daySelect.disabled = true;
          daySelect.value = '';
        }
      });
      
      // Update days when month changes and enable/disable day select
      monthSelect.addEventListener('change', () => {
        if (monthSelect.value) {
          daySelect.disabled = false;
          const selectedYear = parseInt(yearSelect.value);
          const selectedMonth = parseInt(monthSelect.value);
          window.DateUtils.populateDaySelect(daySelect, selectedMonth, selectedYear);
        } else {
          daySelect.disabled = true;
          daySelect.value = '';
        }
      });
      
      dateControls.appendChild(yearSelect);
      dateControls.appendChild(monthSelect);
      dateControls.appendChild(daySelect);
      
      dateSection.appendChild(dateControls);
      content.appendChild(dateSection);
      
      // Notes
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'part-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { 
          id: 'part-notes', 
          rows: 3, 
          className: 'form-control'
        }, part.notes || '')
      ]));
      
      // Submit button
      const submitButton = window.DOMUtils.createButton('Update Part', 'primary-button', () => {
        const brand = document.getElementById('part-brand').value.trim();
        const model = document.getElementById('part-model').value.trim();
        const type = document.getElementById('part-type').value;
        const selectedYear = yearSelect.value ? parseInt(yearSelect.value) : null;
        const selectedMonth = monthSelect.value ? parseInt(monthSelect.value) : null;
        const selectedDay = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('part-notes').value.trim();
        
        // Validate
        if (!brand) {
          alert('Please enter a brand');
          return;
        }
        
        if (!model) {
          alert('Please enter a model');
          return;
        }
        
        if (!type) {
          alert('Please select a type');
          return;
        }
        
        // Create date precision
        let datePrecision = 'none';
        let acquisitionDate = null;
        
        if (selectedYear) {
          if (selectedMonth) {
            if (selectedDay) {
              datePrecision = 'day';
              acquisitionDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
            } else {
              datePrecision = 'month';
              acquisitionDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
            }
          } else {
            datePrecision = 'year';
            acquisitionDate = `${selectedYear}-01-01`;
          }
        }
        
        // Create part object
        const updatedPart = {
          brand,
          model,
          type,
          acquisition_date: acquisitionDate,
          date_precision: datePrecision,
          notes
        };
        
        try {
          // Update part using model
          window.PartModel.updatePart(partId, updatedPart);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh parts list
          window.PartsList.refresh();
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(partId);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part updated successfully', 'success');
        } catch (err) {
          console.error('Error updating part:', err);
          alert('Error updating part: ' + err.message);
        }
      });
      
      content.appendChild(submitButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Edit Part', content);
    } catch (err) {
      console.error('Error showing edit part form:', err);
      alert('Error showing edit part form: ' + err.message);
    }
  }
  
  /**
   * Show confirmation dialog for deleting a part
   * @param {number} partId - Part ID
   */
  function showDeleteConfirmation(partId) {
    try {
      // Get part data
      const part = window.PartModel.getPartById(partId);
      if (!part) {
        throw new Error('Part not found');
      }
      
      // Create confirmation content
      const content = window.DOMUtils.createElement('div');
      
      // Warning text
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        `Are you sure you want to mark ${part.brand} ${part.model} as deleted?`));
      
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        'This is a soft delete. The part will be hidden but can be restored later.'));
      
      // Delete button
      const deleteButton = window.DOMUtils.createButton('Delete Part', 'danger-button', () => {
        try {
          // Delete part using model
          window.PartModel.deletePart(partId);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh parts list
          window.PartsList.refresh();
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part deleted successfully', 'success');
        } catch (err) {
          console.error('Error deleting part:', err);
          alert('Error deleting part: ' + err.message);
        }
      });
      
      content.appendChild(deleteButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Delete Part', content);
    } catch (err) {
      console.error('Error showing delete confirmation:', err);
      alert('Error showing delete confirmation: ' + err.message);
    }
  }
  
  // Public API
  return {
    showPartAddForm,
    showPartEditForm,
    showDeleteConfirmation
  };
})();