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
     * Set the sort parameters for the parts list
     * @param {string} column - Column to sort by
     * @param {string} direction - Sort direction ('asc' or 'desc')
     */
    setSort: function(column, direction) {
      if (column) {
        currentSort.column = column;
      }
      if (direction) {
        currentSort.direction = direction;
      }
    },
    
    /**
     * Initialize the parts list component
     */
    init: function() {
      // Make sure sort indicator spans exist
      document.querySelectorAll('#parts-table th[data-sort]').forEach(header => {
        // Make sure there's a sort indicator span
        if (!header.querySelector('.sort-indicator')) {
          const indicatorSpan = document.createElement('span');
          indicatorSpan.className = 'sort-indicator';
          header.appendChild(indicatorSpan);
        }
        
        // Set up sorting handlers
        header.addEventListener('click', () => {
          const column = header.getAttribute('data-sort');
          // If clicking on the same column, toggle the direction
          const newDirection = (currentSort.column === column && currentSort.direction === 'asc') ? 'desc' : 'asc';
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
      
      // ID no longer displayed, but we'll keep it in the row data attribute
      
      // Brand cell with additional type info on hover
      const brandCell = DOMUtils.createElement('td', {
        title: `${part.type.charAt(0).toUpperCase() + part.type.slice(1)}: ${part.brand} ${part.model}`
      }, part.brand);
      
      // Model cell with Google search link and tooltip
      const modelCell = DOMUtils.createElement('td', {
        title: `${part.type.charAt(0).toUpperCase() + part.type.slice(1)}: ${part.brand} ${part.model}`
      });
      
      // Create a link element for the model
      const modelLink = DOMUtils.createElement('a', {
        href: `https://www.google.com/search?q=${encodeURIComponent(`${part.brand} ${part.model} ${part.type}`)}`,
        className: 'model-link',
        target: '_blank',
        rel: 'noopener noreferrer'
      }, part.model);
      
      modelCell.appendChild(modelLink);
      
      // Type cell with icon
      const typeCell = DOMUtils.createElement('td', {});
      
      // Create icon based on part type - now using static PNG images
      const typeIcon = DOMUtils.createElement('div', { 
        className: 'part-type-icon',
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
      
      // SVG icons need special handling for color - we'll do this by adding a class
      if (isSvg) {
        typeIcon.classList.add('svg-icon');
      }
      
      // Add hidden text for accessibility and sorting
      const typeText = DOMUtils.createElement('span', { className: 'type-text' }, part.type);
      
      typeCell.appendChild(typeIcon);
      typeCell.appendChild(typeText);
      
      // Acquisition date cell
      const acquisitionCell = DOMUtils.createElement('td', {}, 
        part.acquisition_date ? DateUtils.formatDateByPrecision(part.acquisition_date, part.date_precision) : ''
      );
      
      // Status cell with enhanced styling
      const statusCell = DOMUtils.createElement('td', {});
      
      // Create status badge
      const statusBadge = DOMUtils.createElement('span', {
        className: `status-badge status-${part.status}`
      });
      
      // Helper function to generate a color hash from the rig name
      const getColorFromRigName = (name) => {
        // Simple hash function to generate a number from a string
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash) + name.charCodeAt(i);
          hash |= 0; // Convert to 32bit integer
        }
        
        // Generate HSL color with high lightness for pastel look
        // Vary the hue based on the hash, keep saturation moderate
        
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
      };
      
      // Set status text based on condition
      if (part.status === 'active') {
        // For active parts, show the status as a badge
        statusBadge.textContent = 'Active';
        statusCell.appendChild(statusBadge);
        
        // If we have a rig name, show it as a color-coded pill
        if (part.rig_name) {
          // Create the pill container
          const rigPill = DOMUtils.createElement('span', {
            className: 'rig-pill',
            title: part.rig_name // Full name in tooltip
          });
          
          // Set the background color based on the rig name
          const pillColor = getColorFromRigName(part.rig_name);
          rigPill.style.backgroundColor = pillColor;
          
          // Create text element with ellipsis handling
          const rigText = DOMUtils.createElement('span', {
            className: 'rig-pill-text'
          });
          
          // Truncate long names (15 chars max)
          rigText.textContent = part.rig_name.length > 15 
            ? part.rig_name.substring(0, 15) + '…' 
            : part.rig_name;
          
          rigPill.appendChild(rigText);
          statusCell.appendChild(rigPill);
        }
      } else {
        // For other statuses, just show the capitalized status
        statusBadge.textContent = part.status.charAt(0).toUpperCase() + part.status.slice(1);
        statusCell.appendChild(statusBadge);
      }
      
      // Notes cell
      const notesCell = DOMUtils.createElement('td', {}, part.notes);
      
      // Actions cell with dropdown menu
      const actionsCell = DOMUtils.createElement('td', {});
      
      // Create dropdown container
      const dropdown = DOMUtils.createElement('div', { 
        className: 'dropdown'
      });
      
      // Create dropdown trigger button
      const dropdownTrigger = DOMUtils.createElement('button', { 
        className: 'dropdown-trigger',
        title: 'Actions'
      });
      dropdownTrigger.innerHTML = '⋮'; // Vertical ellipsis
      
      // Create dropdown menu
      const dropdownMenu = DOMUtils.createElement('div', { 
        className: 'dropdown-menu',
        tabIndex: -1
      });
      
      // Function to create menu items
      const createMenuItem = (icon, label, className, onClick) => {
        const item = DOMUtils.createElement('button', {
          className: `menu-item ${className || ''}`,
          title: label,
          onclick: onClick
        });
        
        // Create icon container with grayscale icon
        const iconSpan = DOMUtils.createElement('span', { 
          className: 'menu-icon'
        });
        iconSpan.innerHTML = icon;
        
        // Create label
        const labelSpan = DOMUtils.createElement('span', {
          className: 'menu-label'
        }, label);
        
        item.appendChild(iconSpan);
        item.appendChild(labelSpan);
        return item;
      };
      
      // Add section header for Record actions
      const recordHeader = DOMUtils.createElement('div', { 
        className: 'menu-header'
      }, 'Record');
      dropdownMenu.appendChild(recordHeader);
      
      // Edit button
      const editItem = createMenuItem('⚙️', 'Edit', 'edit-action', () => {
        if (window.PartModel && typeof window.PartModel.editPart === 'function') {
          window.PartModel.editPart(part.id);
        }
      });
      dropdownMenu.appendChild(editItem);
      
      // View Timeline button
      const timelineItem = createMenuItem('🕒', 'View Timeline', 'timeline-action', () => {
        if (window.TimelineView && typeof window.TimelineView.showPartTimeline === 'function') {
          window.TimelineView.showPartTimeline(part.id);
        }
      });
      dropdownMenu.appendChild(timelineItem);
      
      // Add section divider
      const divider = DOMUtils.createElement('hr', { className: 'menu-divider' });
      dropdownMenu.appendChild(divider);
      
      // Add section header for Timeline actions
      const timelineHeader = DOMUtils.createElement('div', { 
        className: 'menu-header'
      }, 'Timeline');
      dropdownMenu.appendChild(timelineHeader);
      
      // Conditional buttons based on context
      
      // Connect/disconnect button if not deleted
      if (!part.is_deleted) {
        const activeConnections = part.active_connections;
        const isConnected = activeConnections > 0;
        
        const connectItem = createMenuItem(
          isConnected ? '🔌' : '🔗', 
          isConnected ? 'Disconnect' : 'Connect',
          isConnected ? 'disconnect-action' : 'connect-action',
          () => {
            if (isConnected) {
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
        dropdownMenu.appendChild(connectItem);
      }
      
      // Rig button for motherboards
      if (part.type === 'motherboard' && !part.is_deleted) {
        const rigName = part.rig_name;
        const rigItem = createMenuItem(
          '🏷️', 
          rigName ? 'Rename Rig' : 'Name Rig',
          'rig-action',
          () => {
            if (window.RigController && typeof window.RigController.showRigIdentityForm === 'function') {
              window.RigController.showRigIdentityForm(part.id, rigName);
            }
          }
        );
        dropdownMenu.appendChild(rigItem);
      }
      
      // Dispose button for non-deleted parts
      if (!part.is_deleted) {
        const disposeItem = createMenuItem(
          '🗑️', 
          'Dispose',
          'dispose-action',
          () => {
            if (window.DisposalController && typeof window.DisposalController.showDisposePartForm === 'function') {
              window.DisposalController.showDisposePartForm(part.id);
            }
          }
        );
        dropdownMenu.appendChild(disposeItem);
      }
      
      // Add another divider
      const adminDivider = DOMUtils.createElement('hr', { className: 'menu-divider' });
      dropdownMenu.appendChild(adminDivider);
      
      // Admin section (permanent delete)
      const adminHeader = DOMUtils.createElement('div', { 
        className: 'menu-header admin-header'
      }, 'Admin');
      dropdownMenu.appendChild(adminHeader);
      
      // Admin delete button
      const adminDeleteItem = createMenuItem(
        '❌', 
        'Delete from History',
        'admin-action',
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
      dropdownMenu.appendChild(adminDeleteItem);
      
      // Toggle dropdown visibility
      dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = dropdown.classList.contains('active');
        
        // Close all other open dropdowns first
        document.querySelectorAll('.dropdown.active').forEach(dd => {
          if (dd !== dropdown) dd.classList.remove('active');
        });
        
        // Toggle this dropdown
        dropdown.classList.toggle('active');
        
        // Position the dropdown menu correctly
        if (!isActive) {
          // Get trigger button position
          const buttonRect = dropdownTrigger.getBoundingClientRect();
          
          // Calculate and position the dropdown
          dropdownMenu.style.top = `${buttonRect.bottom + 5}px`;
          dropdownMenu.style.left = `${buttonRect.left}px`;
          
          // Make sure it doesn't go off-screen to the right
          const menuWidth = 180; // From CSS
          if (buttonRect.left + menuWidth > window.innerWidth) {
            dropdownMenu.style.left = `${window.innerWidth - menuWidth - 10}px`;
          }
          
          // Focus the menu for keyboard navigation
          dropdownMenu.focus();
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown.classList.remove('active');
      });
      
      // Add elements to the DOM
      dropdown.appendChild(dropdownTrigger);
      dropdown.appendChild(dropdownMenu);
      actionsCell.appendChild(dropdown);
      
      // Add cells to row in the new order (actions first)
      row.appendChild(actionsCell);
      row.appendChild(typeCell);
      row.appendChild(brandCell);
      row.appendChild(modelCell);
      row.appendChild(acquisitionCell);
      row.appendChild(statusCell);
      row.appendChild(notesCell);
      
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