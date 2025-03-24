/**
 * PC History Tracker - Main Application
 * 
 * This is the main entry point for the application.
 * It initializes the app and coordinates between modules.
 */

// IIFE to avoid global scope pollution
(function() {
  // Wait for window.App to be available then set up custom event handlers
  // main.js handles the basic initialization
  const setupCustomHandlers = () => {
    console.log('Setting up additional event handlers...');
    
    // Setup event listeners for parts list and filters
    setupEventListeners();
  };
  
  // Check if the DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCustomHandlers);
  } else {
    // DOM already loaded, run setup immediately
    setupCustomHandlers();
  }
  
  /**
   * Set up application-wide event listeners
   */
  function setupEventListeners() {
    // Setup part actions
    const addPartBtn = document.getElementById('add-part-btn');
    if (addPartBtn) {
      addPartBtn.addEventListener('click', () => {
        window.PartController.showPartAddForm();
      });
    }
    
    // Setup filter controls
    setupFilterControls();
    
    // Setup part actions menu (using event delegation)
    const partsTableBody = document.getElementById('parts-table-body');
    if (partsTableBody) {
      partsTableBody.addEventListener('click', handlePartAction);
    }
    
    // Setup parts export/import
    const exportCsvBtn = document.getElementById('export-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportPartsCSV);
    }
    
    const importCsvBtn = document.getElementById('import-csv');
    if (importCsvBtn) {
      importCsvBtn.addEventListener('click', importPartsCSV);
    }
    
    // Note: Save/open DB buttons are already handled in main.js
    
    // Confirm before closing with unsaved changes
    window.addEventListener('beforeunload', (event) => {
      if (window.App && window.App.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    });
  }
  
  /**
   * Setup filter controls for parts list
   */
  function setupFilterControls() {
    // Type filter
    const typeFilter = document.getElementById('filter-type');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        window.PartsList.refresh();
      });
    }
    
    // Status filter
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        window.PartsList.refresh();
      });
    }
    
    // Search input
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          window.PartsList.refresh();
        }, 300);
      });
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => {
        window.PartsList.refresh();
      });
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn && typeFilter && statusFilter && searchInput) {
      clearFiltersBtn.addEventListener('click', () => {
        typeFilter.value = 'all';
        statusFilter.value = 'all';
        searchInput.value = '';
        window.PartsList.refresh();
      });
    }
    
    // Sort column headers (using event delegation)
    const tableHeader = document.querySelector('#parts-table thead');
    if (tableHeader) {
      tableHeader.addEventListener('click', (event) => {
        const target = event.target.closest('th[data-sort]');
        if (!target) return;
        
        const column = target.getAttribute('data-sort');
        // Use classList to check for current direction
        const currentDirection = target.classList.contains('sort-desc') ? 'desc' : 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        
        // Update sort indicators - remove previous sort classes
        document.querySelectorAll('th[data-sort]').forEach(th => {
          th.classList.remove('sort-asc', 'sort-desc');
          
          // Make sure there's a sort indicator span
          if (!th.querySelector('.sort-indicator')) {
            const indicatorSpan = document.createElement('span');
            indicatorSpan.className = 'sort-indicator';
            th.appendChild(indicatorSpan);
          }
        });
        
        // Set the appropriate sort class based on direction
        target.classList.add(newDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        
        // Refresh parts with new sort
        window.PartsList.setSort(column, newDirection);
        window.PartsList.refresh();
      });
    }
  }
  
  /**
   * Handle part row actions (edit, delete, etc.)
   */
  function handlePartAction(event) {
    const target = event.target;
    const row = target.closest('tr');
    if (!row) return;
    
    const partId = parseInt(row.getAttribute('data-part-id'), 10);
    if (!partId) return;
    
    // Handle different action buttons
    if (target.classList.contains('edit-part-btn')) {
      window.PartController.showPartEditForm(partId);
    } else if (target.classList.contains('delete-part-btn')) {
      window.PartController.showDeleteConfirmation(partId);
    } else if (target.classList.contains('connect-part-btn')) {
      window.ConnectionController.showConnectOptions(partId);
    } else if (target.classList.contains('disconnect-part-btn')) {
      window.ConnectionController.showDisconnectOptions(partId);
    } else if (target.classList.contains('dispose-part-btn')) {
      window.DisposalController.showDisposeOptions(partId);
    } else if (target.classList.contains('add-rig-btn')) {
      window.RigController.showRigAddForm(partId);
    } else if (target.classList.contains('view-timeline-btn')) {
      window.TimelineView.showPartTimeline(partId);
    }
  }
  
  /**
   * Export parts to CSV
   */
  function exportPartsCSV() {
    try {
      if (!window.DatabaseService.getDatabase()) {
        window.DOMUtils.showToast('No database to export', 'error');
        return;
      }
      
      // Get all parts
      const parts = window.PartModel.getAllParts();
      
      // Create CSV content
      let csv = 'ID,Brand,Model,Type,Acquisition Date,Status,Notes\n';
      
      parts.forEach(part => {
        // Format date
        let date = part.acquisition_date || '';
        if (date && part.date_precision) {
          const dateObj = new Date(date);
          
          if (part.date_precision === 'year') {
            date = dateObj.getFullYear().toString();
          } else if (part.date_precision === 'month') {
            date = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
          } else {
            date = dateObj.toISOString().split('T')[0];
          }
        }
        
        // Escape and format fields
        const fields = [
          part.id,
          `"${part.brand.replace(/"/g, '""')}"`,
          `"${part.model.replace(/"/g, '""')}"`,
          part.type,
          date,
          part.status,
          `"${(part.notes || '').replace(/"/g, '""')}"`
        ];
        
        csv += fields.join(',') + '\n';
      });
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pc_parts_export.csv';
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      
      window.DOMUtils.showToast('Parts exported successfully', 'success');
    } catch (err) {
      console.error('Error exporting parts:', err);
      window.DOMUtils.showToast('Error exporting parts', 'error');
    }
  }
  
  /**
   * Import parts from CSV
   */
  function importPartsCSV() {
    try {
      if (!window.DatabaseService.getDatabase()) {
        window.DOMUtils.showToast('No database to import to', 'error');
        return;
      }
      
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      
      input.addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const content = event.target.result;
            const lines = content.split('\n');
            
            // Skip header row
            const header = lines[0];
            const expectedHeader = 'ID,Brand,Model,Type,Acquisition Date,Status,Notes';
            
            if (!header.startsWith('ID,Brand,Model,Type')) {
              throw new Error('Invalid CSV format. Expected header: ID,Brand,Model,Type,...');
            }
            
            // Parse rows
            const parts = [];
            
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // CSV parsing with support for quoted fields
              const fields = [];
              let field = '';
              let inQuotes = false;
              
              for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                  if (inQuotes && j < line.length - 1 && line[j+1] === '"') {
                    // Double quotes inside quotes - add a single quote
                    field += '"';
                    j++;
                  } else {
                    // Toggle quotes mode
                    inQuotes = !inQuotes;
                  }
                } else if (char === ',' && !inQuotes) {
                  // End of field
                  fields.push(field);
                  field = '';
                } else {
                  field += char;
                }
              }
              
              // Add the last field
              fields.push(field);
              
              // Create part object
              if (fields.length >= 6) {
                const [id, brand, model, type, acquisitionDate, status, ...notesArr] = fields;
                const notes = notesArr.join(',');
                
                // Parse date
                let acquisition_date = null;
                let date_precision = 'none';
                
                if (acquisitionDate) {
                  const dateParts = acquisitionDate.split('-');
                  
                  if (dateParts.length === 3) {
                    acquisition_date = acquisitionDate;
                    date_precision = 'day';
                  } else if (dateParts.length === 2) {
                    acquisition_date = `${dateParts[0]}-${dateParts[1]}-01`;
                    date_precision = 'month';
                  } else if (dateParts.length === 1 && /^\d{4}$/.test(dateParts[0])) {
                    acquisition_date = `${dateParts[0]}-01-01`;
                    date_precision = 'year';
                  }
                }
                
                parts.push({
                  brand: brand.replace(/^"(.*)"$/, '$1'),
                  model: model.replace(/^"(.*)"$/, '$1'),
                  type,
                  acquisition_date,
                  date_precision,
                  notes: notes.replace(/^"(.*)"$/, '$1')
                });
              }
            }
            
            // Add parts to database
            if (parts.length === 0) {
              throw new Error('No valid parts found in CSV');
            }
            
            // Begin transaction
            const db = window.DatabaseService.getDatabase();
            db.run('BEGIN TRANSACTION');
            
            try {
              // Add parts
              parts.forEach(part => {
                window.PartModel.addPart(part);
              });
              
              // Commit transaction
              db.run('COMMIT');
              
              // Update state
              window.App.hasUnsavedChanges = true;
              window.App.updateSaveStatus();
              
              // Auto-save
              window.App.saveDatabase();
              
              // Refresh parts list
              window.PartsList.refresh();
              
              window.DOMUtils.showToast(`Imported ${parts.length} parts successfully`, 'success');
            } catch (err) {
              // Rollback transaction on error
              db.run('ROLLBACK');
              throw err;
            }
          } catch (err) {
            console.error('Error parsing CSV:', err);
            window.DOMUtils.showToast('Error importing parts: ' + err.message, 'error');
          }
        };
        
        reader.onerror = () => {
          window.DOMUtils.showToast('Error reading file', 'error');
        };
        
        reader.readAsText(file);
      });
      
      // Trigger file selection
      input.click();
    } catch (err) {
      console.error('Error importing parts:', err);
      window.DOMUtils.showToast('Error importing parts', 'error');
    }
  }
})();