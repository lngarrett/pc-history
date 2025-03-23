/**
 * Parts List Component for PC History Tracker
 */

// Create PartsList namespace
window.PartsList = (function() {
  // Private variables
  let currentSort = {
    column: 'id',
    direction: 'asc'
  };

  let currentFilters = {
    type: 'all',
    status: 'all',
    search: ''
  };
  
  return {
    /**
     * Initialize the parts list component
     */
    init: function() {
      // Set up sorting handlers
      document.querySelectorAll('#parts-table th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
          const column = header.getAttribute('data-sort');
          const currentDirection = currentSort.column === column ? currentSort.direction : 'desc';
          // Toggle direction if clicking on the same column
          const newDirection = (currentSort.column === column && currentDirection === 'asc') ? 'desc' : 'asc';
          this.refresh(column, newDirection);
        });
      });
      
      // Set up filter controls
      document.getElementById('apply-filters').addEventListener('click', () => {
        const typeFilter = document.getElementById('filter-type').value;
        const statusFilter = document.getElementById('filter-status').value;
        const searchFilter = document.getElementById('filter-search').value.trim();
        
        this.refresh(null, null, {
          type: typeFilter,
          status: statusFilter,
          search: searchFilter
        });
      });
      
      // Clear filters
      document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('filter-type').value = 'all';
        document.getElementById('filter-status').value = 'all';
        document.getElementById('filter-search').value = '';
        
        this.refresh(null, null, {
          type: 'all',
          status: 'all',
          search: ''
        });
      });
    },
    
    /**
     * Refresh the parts list
     * @param {string} sortColumn - Column to sort by
     * @param {string} sortDirection - Sort direction ('asc' or 'desc')
     * @param {Object} filters - Filters to apply
     */
    refresh: function(sortColumn, sortDirection, filters) {
      // Update current sort if provided
      if (sortColumn) {
        currentSort.column = sortColumn;
      }
      
      // Toggle or set sort direction
      if (sortDirection) {
        currentSort.direction = sortDirection;
      }
      
      // Update filters if provided
      if (filters) {
        currentFilters = { ...currentFilters, ...filters };
      }
      
      // Update UI to show current sort
      const headers = document.querySelectorAll('#parts-table th[data-sort]');
      headers.forEach(header => {
        const headerColumn = header.getAttribute('data-sort');
        header.classList.remove('sort-asc', 'sort-desc');
        
        if (headerColumn === currentSort.column) {
          header.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
      });
      
      // Update active filters display
      this.updateActiveFiltersDisplay();
      
      // Clear the table
      const tbody = document.querySelector('#parts-table tbody');
      DOMUtils.clearElement(tbody);
      
      try {
        // Get parts with current sort and filters - placeholder until Part model is implemented
        const parts = window.PartModel ? window.PartModel.getAllParts(currentFilters, currentSort.column, currentSort.direction) : [];
        
        // Update the results count
        document.getElementById('results-count').textContent = `${parts.length} parts found`;
        
        // Render the parts
        parts.forEach(part => this.renderPartRow(tbody, part));
      } catch (err) {
        console.error('Error refreshing parts list:', err);
        document.getElementById('results-count').textContent = 'Error loading parts';
      }
    },
    
    /**
     * Render a part row
     * @param {HTMLElement} tbody - Table body element
     * @param {Object} part - Part data
     */
    renderPartRow: function(tbody, part) {
      const row = DOMUtils.createElement('tr', {
        className: part.is_deleted ? 'deleted-part' : '',
        dataset: { id: part.id }
      });
      
      // ID cell
      const idCell = DOMUtils.createElement('td', {}, part.id);
      
      // Brand cell
      const brandCell = DOMUtils.createElement('td', {}, part.brand);
      
      // Model cell
      const modelCell = DOMUtils.createElement('td', {}, part.model);
      
      // Type cell
      const typeCell = DOMUtils.createElement('td', {}, part.type);
      
      // Acquisition date cell
      const acquisitionCell = DOMUtils.createElement('td', {}, 
        part.acquisition_date ? DateUtils.formatDateByPrecision(part.acquisition_date, part.date_precision) : ''
      );
      
      // Status cell
      const statusCell = DOMUtils.createElement('td', {}, part.status);
      
      // Notes cell
      const notesCell = DOMUtils.createElement('td', {}, part.notes);
      
      // Actions cell
      const actionsCell = DOMUtils.createElement('td', {});
      const actionButtonsContainer = DOMUtils.createElement('div', { className: 'action-buttons' });
      
      // Edit button
      const editBtn = DOMUtils.createButton('Edit', 'edit-btn', () => {
        if (window.PartModel && typeof window.PartModel.editPart === 'function') {
          window.PartModel.editPart(part.id);
        }
      });
      
      // Timeline button
      const timelineBtn = DOMUtils.createButton('Timeline', 'view-timeline-btn view-timeline', 
        () => {
          if (window.TimelineView && typeof window.TimelineView.showPartTimeline === 'function') {
            window.TimelineView.showPartTimeline(part.id);
          }
        }, 
        { 'data-id': part.id }
      );
      
      actionButtonsContainer.appendChild(editBtn);
      actionButtonsContainer.appendChild(timelineBtn);
      
      // Add connect/disconnect button if not deleted
      if (!part.is_deleted) {
        const activeConnections = part.active_connections;
        const connectBtn = DOMUtils.createButton(
          activeConnections > 0 ? 'Disconnect' : 'Connect',
          activeConnections > 0 ? 'disconnect-btn' : 'connect-btn',
          () => {
            if (activeConnections > 0) {
              if (window.ConnectionController && typeof window.ConnectionController.showDisconnectOptions === 'function') {
                window.ConnectionController.showDisconnectOptions(part.id);
              }
            } else {
              if (window.ConnectionController && typeof window.ConnectionController.showConnectOptions === 'function') {
                window.ConnectionController.showConnectOptions(part.id);
              }
            }
          }
        );
        actionButtonsContainer.appendChild(connectBtn);
      }
      
      // Add rig button for motherboards
      if (part.type === 'motherboard' && !part.is_deleted) {
        const rigName = part.rig_name;
        const rigBtn = DOMUtils.createButton(
          rigName ? 'Rename Rig' : 'Name Rig',
          'rig-btn',
          () => {
            if (window.RigController && typeof window.RigController.showRigIdentityForm === 'function') {
              window.RigController.showRigIdentityForm(part.id, rigName);
            }
          }
        );
        actionButtonsContainer.appendChild(rigBtn);
      }
      
      // Add dispose button for non-deleted parts
      if (!part.is_deleted) {
        const deleteBtn = DOMUtils.createButton('Dispose', 'delete-btn', () => {
          if (window.DisposalController && typeof window.DisposalController.showDisposePartForm === 'function') {
            window.DisposalController.showDisposePartForm(part.id);
          }
        });
        actionButtonsContainer.appendChild(deleteBtn);
      }
      
      // Add admin delete button
      const adminDeleteBtn = DOMUtils.createButton('Delete from History', 'admin-button', 
        () => DOMUtils.showConfirmDialog(
          'Are you sure you want to permanently delete this part? This will remove it and all its history from the database.',
          () => {
            if (window.PartModel && typeof window.PartModel.hardDeletePart === 'function') {
              window.PartModel.hardDeletePart(part.id);
              this.refresh();
            }
          }
        )
      );
      actionButtonsContainer.appendChild(adminDeleteBtn);
      
      actionsCell.appendChild(actionButtonsContainer);
      
      // Add cells to row
      row.appendChild(idCell);
      row.appendChild(brandCell);
      row.appendChild(modelCell);
      row.appendChild(typeCell);
      row.appendChild(acquisitionCell);
      row.appendChild(statusCell);
      row.appendChild(notesCell);
      row.appendChild(actionsCell);
      
      // Add row to table body
      tbody.appendChild(row);
    },
    
    /**
     * Update the active filters display
     */
    updateActiveFiltersDisplay: function() {
      const display = document.getElementById('active-filters-display');
      const activeFilters = [];
      
      if (currentFilters.type && currentFilters.type !== 'all') {
        activeFilters.push(`Type: ${currentFilters.type}`);
      }
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        activeFilters.push(`Status: ${currentFilters.status}`);
      }
      
      if (currentFilters.search && currentFilters.search.trim() !== '') {
        activeFilters.push(`Search: "${currentFilters.search}"`);
      }
      
      if (activeFilters.length > 0) {
        display.textContent = activeFilters.join(' | ');
        display.classList.add('has-filters');
      } else {
        display.textContent = 'No active filters';
        display.classList.remove('has-filters');
      }
    }
  };
})();