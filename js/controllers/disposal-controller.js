/**
 * Disposal Controller for PC History Tracker
 * Handles part disposal UI
 */

// Create namespace
window.DisposalController = (function() {
  // Private members
  
  /**
   * Show options for disposing a part
   * @param {number} partId - Part ID
   */
  function showDisposePartForm(partId) {
    try {
      // Get part data
      const part = window.PartModel.getPartById(partId);
      if (!part) {
        throw new Error('Part not found');
      }
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      // Info text
      content.appendChild(window.DOMUtils.createElement('p', {}, 
        `Dispose of ${part.brand} ${part.model}?`));
      
      // Make sure part is disconnected first if it's connected
      if (part.status === 'active') {
        content.appendChild(window.DOMUtils.createElement('p', 
          { className: 'warning-text' }, 
          'This part is currently connected to a motherboard. You must disconnect it first.'));
        
        // Show modal with warning
        const modal = window.DOMUtils.showModal('Dispose Part', content);
        
        // Add close button
        const closeButton = window.DOMUtils.createButton('Close', 'secondary-button', () => {
          document.body.removeChild(modal);
        });
        content.appendChild(closeButton);
        
        return;
      }
      
      // Disposal method
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'disposal-method' }, 'Disposal Method:'),
        (() => {
          const select = window.DOMUtils.createElement('select', { id: 'disposal-method', className: 'form-control' });
          
          const methods = [
            { value: 'sold', label: 'Sold' },
            { value: 'gifted', label: 'Gifted' },
            { value: 'recycled', label: 'Recycled' },
            { value: 'trashed', label: 'Trashed' },
            { value: 'returned', label: 'Returned' },
            { value: 'lost', label: 'Lost' },
            { value: 'other', label: 'Other' }
          ];
          
          methods.forEach(method => {
            select.appendChild(window.DOMUtils.createElement('option', { value: method.value }, method.label));
          });
          
          return select;
        })()
      ]));
      
      // Recipient (for sold/gifted)
      const recipientGroup = window.DOMUtils.createElement('div', { 
        className: 'form-group recipient-group' 
      });
      
      recipientGroup.appendChild(window.DOMUtils.createElement('label', { for: 'disposal-recipient' }, 'Recipient:'));
      recipientGroup.appendChild(window.DOMUtils.createElement('input', { 
        type: 'text', 
        id: 'disposal-recipient', 
        className: 'form-control'
      }));
      
      content.appendChild(recipientGroup);
      
      // Show/hide recipient based on method
      document.getElementById('disposal-method').addEventListener('change', (e) => {
        const method = e.target.value;
        if (method === 'sold' || method === 'gifted' || method === 'returned') {
          recipientGroup.style.display = 'block';
        } else {
          recipientGroup.style.display = 'none';
        }
      });
      
      // Price (for sold)
      const priceGroup = window.DOMUtils.createElement('div', { 
        className: 'form-group price-group', 
        style: 'display: none;' 
      });
      
      priceGroup.appendChild(window.DOMUtils.createElement('label', { for: 'disposal-price' }, 'Price:'));
      priceGroup.appendChild(window.DOMUtils.createElement('input', { 
        type: 'text', 
        id: 'disposal-price', 
        className: 'form-control',
        placeholder: 'e.g. $50'
      }));
      
      content.appendChild(priceGroup);
      
      // Show/hide price based on method
      document.getElementById('disposal-method').addEventListener('change', (e) => {
        const method = e.target.value;
        if (method === 'sold') {
          priceGroup.style.display = 'block';
        } else {
          priceGroup.style.display = 'none';
        }
      });
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Disposal Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'disposal-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'disposal-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'disposal-day' });
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
        window.DOMUtils.createElement('label', { for: 'disposal-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'disposal-notes', rows: 3, className: 'form-control' })
      ]));
      
      // Dispose button
      const disposeButton = window.DOMUtils.createButton('Dispose Part', 'danger-button', () => {
        const method = document.getElementById('disposal-method').value;
        const recipient = document.getElementById('disposal-recipient').value.trim();
        const price = document.getElementById('disposal-price').value.trim();
        const year = parseInt(yearSelect.value);
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        const notes = document.getElementById('disposal-notes').value.trim();
        
        // Validate
        if (!method) {
          alert('Please select a disposal method');
          return;
        }
        
        if ((method === 'sold' || method === 'gifted' || method === 'returned') && !recipient) {
          alert('Please enter a recipient');
          return;
        }
        
        if (!year) {
          alert('Please select a year');
          return;
        }
        
        // Create date info object
        const dateInfo = { year, month, day };
        
        // Create disposal info
        const disposalInfo = {
          method,
          recipient: (method === 'sold' || method === 'gifted' || method === 'returned') ? recipient : null,
          price: method === 'sold' ? price : null,
          notes
        };
        
        try {
          // Dispose part using model
          window.DisposalModel.disposePart(partId, dateInfo, disposalInfo);
          
          // Update state
          window.App.hasUnsavedChanges = true;
          window.App.updateSaveStatus();
          
          // Auto-save
          window.App.saveDatabase();
          
          // Refresh all affected views
          window.PartsList.refresh();
          
          // Also refresh the rigs view since disposal can affect rig status
          if (window.RigsView && typeof window.RigsView.refresh === 'function') {
            window.RigsView.refresh();
          }
          
          // If timeline is open, refresh it
          if (document.getElementById('part-timeline-view').classList.contains('hidden') === false) {
            window.TimelineView.showPartTimeline(partId);
          }
          
          // Close modal
          document.body.removeChild(modal);
          
          window.DOMUtils.showToast('Part disposed successfully', 'success');
        } catch (err) {
          console.error('Error disposing part:', err);
          alert('Error disposing part: ' + err.message);
        }
      });
      
      content.appendChild(disposeButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Dispose Part', content);
    } catch (err) {
      console.error('Error showing dispose options:', err);
      alert('Error showing dispose options: ' + err.message);
    }
  }
  
  /**
   * Show disposal history for a part
   * @param {number} partId - Part ID
   */
  function showDisposalHistory(partId) {
    try {
      // Get part data
      const part = window.PartModel.getPartById(partId);
      if (!part) {
        throw new Error('Part not found');
      }
      
      // Get disposal history
      const disposals = window.DisposalModel.getDisposalHistory(partId);
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      // Part info
      content.appendChild(window.DOMUtils.createElement('h3', {}, `${part.brand} ${part.model}`));
      
      if (disposals.length === 0) {
        content.appendChild(window.DOMUtils.createElement('p', {}, 'No disposal history found for this part.'));
      } else {
        // Create disposal history table
        const table = window.DOMUtils.createElement('table', { className: 'data-table' });
        
        // Header row
        const thead = window.DOMUtils.createElement('thead');
        const headerRow = window.DOMUtils.createElement('tr');
        
        ['Date', 'Method', 'Recipient', 'Price', 'Notes'].forEach(header => {
          headerRow.appendChild(window.DOMUtils.createElement('th', {}, header));
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = window.DOMUtils.createElement('tbody');
        
        disposals.forEach(disposal => {
          const row = window.DOMUtils.createElement('tr');
          
          // Format date
          let dateStr = 'Unknown';
          if (disposal.date) {
            const date = new Date(disposal.date);
            
            if (disposal.date_precision === 'year') {
              dateStr = date.getFullYear().toString();
            } else if (disposal.date_precision === 'month') {
              dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else {
              dateStr = date.toISOString().split('T')[0];
            }
          }
          
          // Add cells
          row.appendChild(window.DOMUtils.createElement('td', {}, dateStr));
          row.appendChild(window.DOMUtils.createElement('td', {}, disposal.method));
          row.appendChild(window.DOMUtils.createElement('td', {}, disposal.recipient || ''));
          row.appendChild(window.DOMUtils.createElement('td', {}, disposal.price || ''));
          row.appendChild(window.DOMUtils.createElement('td', {}, disposal.notes || ''));
          
          tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        content.appendChild(table);
      }
      
      // Show modal
      window.DOMUtils.showModal('Disposal History', content);
    } catch (err) {
      console.error('Error showing disposal history:', err);
      alert('Error showing disposal history: ' + err.message);
    }
  }
  
  /**
   * Show form for disposing multiple parts at once
   * @param {Array} partIds - Array of part IDs to dispose
   */
  function showBulkDisposeForm(partIds) {
    if (!partIds || partIds.length === 0) {
      return;
    }
    
    try {
      // Verify that all parts can be disposed
      const partsToDispose = [];
      const connectedParts = [];
      
      for (const partId of partIds) {
        const part = window.PartModel.getPartById(partId);
        if (!part) {
          throw new Error(`Part with ID ${partId} not found`);
        }
        
        // Check if the part is connected
        if (part.status === 'active') {
          connectedParts.push(`${part.brand} ${part.model}`);
        } else {
          partsToDispose.push(part);
        }
      }
      
      // Create modal content
      const content = window.DOMUtils.createElement('div');
      
      // Show warning if any parts are connected
      if (connectedParts.length > 0) {
        content.appendChild(window.DOMUtils.createElement('p', { 
          className: 'warning-text' 
        }, `The following parts cannot be disposed because they are currently connected: ${connectedParts.join(', ')}`));
        
        if (partsToDispose.length === 0) {
          content.appendChild(window.DOMUtils.createElement('p', {}, 'No parts are available for disposal.'));
          window.DOMUtils.showModal('Bulk Dispose Parts', content);
          return;
        }
        
        content.appendChild(window.DOMUtils.createElement('p', {}, `Proceeding with disposal of ${partsToDispose.length} parts.`));
      } else {
        content.appendChild(window.DOMUtils.createElement('p', {}, `You are about to dispose of ${partIds.length} parts. All parts will share the same disposal information.`));
      }
      
      // Disposal method
      content.appendChild(window.DOMUtils.createElement('div', { className: 'form-group' }, [
        window.DOMUtils.createElement('label', { for: 'bulk-disposal-method' }, 'Disposal Method:'),
        (() => {
          const select = window.DOMUtils.createElement('select', { id: 'bulk-disposal-method', className: 'form-control' });
          
          const methods = [
            { value: 'sold', label: 'Sold' },
            { value: 'gifted', label: 'Gifted' },
            { value: 'recycled', label: 'Recycled' },
            { value: 'trashed', label: 'Trashed' },
            { value: 'returned', label: 'Returned' },
            { value: 'lost', label: 'Lost' },
            { value: 'other', label: 'Other' }
          ];
          
          methods.forEach(method => {
            select.appendChild(window.DOMUtils.createElement('option', { value: method.value }, method.label));
          });
          
          return select;
        })()
      ]));
      
      // Recipient (for sold/gifted)
      const recipientGroup = window.DOMUtils.createElement('div', { 
        className: 'form-group recipient-group' 
      });
      
      recipientGroup.appendChild(window.DOMUtils.createElement('label', { for: 'bulk-disposal-recipient' }, 'Recipient:'));
      recipientGroup.appendChild(window.DOMUtils.createElement('input', { 
        type: 'text', 
        id: 'bulk-disposal-recipient', 
        className: 'form-control'
      }));
      
      content.appendChild(recipientGroup);
      
      // Show/hide recipient based on method
      const methodSelect = content.querySelector('#bulk-disposal-method');
      methodSelect.addEventListener('change', (e) => {
        const method = e.target.value;
        if (method === 'sold' || method === 'gifted' || method === 'returned') {
          recipientGroup.style.display = 'block';
        } else {
          recipientGroup.style.display = 'none';
        }
        
        // Also update price group visibility
        if (method === 'sold') {
          priceGroup.style.display = 'block';
        } else {
          priceGroup.style.display = 'none';
        }
      });
      
      // Price (for sold)
      const priceGroup = window.DOMUtils.createElement('div', { 
        className: 'form-group price-group', 
        style: 'display: none;' 
      });
      
      priceGroup.appendChild(window.DOMUtils.createElement('label', { for: 'bulk-disposal-price' }, 'Price:'));
      priceGroup.appendChild(window.DOMUtils.createElement('input', { 
        type: 'text', 
        id: 'bulk-disposal-price', 
        className: 'form-control',
        placeholder: 'e.g. $50'
      }));
      
      content.appendChild(priceGroup);
      
      // Date selection
      const dateSection = window.DOMUtils.createElement('div', { className: 'form-group' });
      dateSection.appendChild(window.DOMUtils.createElement('label', {}, 'Disposal Date:'));
      
      const dateControls = window.DOMUtils.createElement('div', { className: 'date-input-group' });
      
      // Year select
      const yearSelect = window.DOMUtils.createElement('select', { id: 'bulk-disposal-year', required: true });
      yearSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Year'));
      
      // Month select
      const monthSelect = window.DOMUtils.createElement('select', { id: 'bulk-disposal-month' });
      monthSelect.appendChild(window.DOMUtils.createElement('option', { value: '' }, 'Month (optional)'));
      for (let i = 1; i <= 12; i++) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthSelect.appendChild(window.DOMUtils.createElement('option', { value: i }, monthNames[i-1]));
      }
      
      // Day select
      const daySelect = window.DOMUtils.createElement('select', { id: 'bulk-disposal-day' });
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
        window.DOMUtils.createElement('label', { for: 'bulk-disposal-notes' }, 'Notes:'),
        window.DOMUtils.createElement('textarea', { id: 'bulk-disposal-notes', rows: 3, className: 'form-control' })
      ]));
      
      // Dispose button
      const disposeButton = window.DOMUtils.createButton(
        `Dispose ${partsToDispose.length} Parts`, 
        'danger-button', 
        async () => {
          const method = document.getElementById('bulk-disposal-method').value;
          const recipient = document.getElementById('bulk-disposal-recipient').value.trim();
          const price = document.getElementById('bulk-disposal-price').value.trim();
          const year = parseInt(yearSelect.value);
          const month = monthSelect.value ? parseInt(monthSelect.value) : null;
          const day = daySelect.value ? parseInt(daySelect.value) : null;
          const notes = document.getElementById('bulk-disposal-notes').value.trim();
          
          // Validate
          if (!method) {
            alert('Please select a disposal method');
            return;
          }
          
          if ((method === 'sold' || method === 'gifted' || method === 'returned') && !recipient) {
            alert('Please enter a recipient');
            return;
          }
          
          if (!year) {
            alert('Please select a year');
            return;
          }
          
          // Create date info object
          const dateInfo = { year, month, day };
          
          // Create disposal info
          const disposalInfo = {
            method,
            recipient: (method === 'sold' || method === 'gifted' || method === 'returned') ? recipient : null,
            price: method === 'sold' ? price : null,
            notes
          };
          
          try {
            let successCount = 0;
            
            // Dispose all parts
            for (const part of partsToDispose) {
              try {
                window.DisposalModel.disposePart(part.id, dateInfo, disposalInfo);
                successCount++;
              } catch (err) {
                console.error(`Error disposing part ${part.id}:`, err);
              }
            }
            
            // Update state
            window.App.hasUnsavedChanges = true;
            window.App.updateSaveStatus();
            
            // Auto-save
            await window.App.saveDatabase();
            
            // Refresh all affected views
            window.PartsList.refresh();
            
            // Also refresh the rigs view since disposal can affect rig status
            if (window.RigsView && typeof window.RigsView.refresh === 'function') {
              window.RigsView.refresh();
            }
            
            // Close modal
            document.body.removeChild(modal);
            
            window.DOMUtils.showToast(`${successCount} parts disposed successfully`, 'success');
          } catch (err) {
            console.error('Error during bulk dispose operation:', err);
            alert('Error disposing parts: ' + err.message);
          }
        }
      );
      
      content.appendChild(disposeButton);
      
      // Show modal
      const modal = window.DOMUtils.showModal('Bulk Dispose Parts', content);
    } catch (err) {
      console.error('Error showing bulk dispose options:', err);
      alert('Error: ' + err.message);
    }
  }
  
  // Public API
  return {
    showDisposePartForm,
    showDisposalHistory,
    showBulkDisposeForm
  };
})();