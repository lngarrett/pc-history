/**
 * Parts List Component for PC History Tracker
 */

// Create PartsList namespace
window.PartsList = (function() {
  // Private variables
  let currentSort = {
    column: 'acquisition_date',
    direction: 'desc'
  };

  let currentFilters = {
    type: 'all',
    status: 'all',
    search: ''
  };
  
  let currentGrouping = 'none'; // 'none', 'rig', 'type', or 'status'
  
  // Track selected parts for bulk actions
  let selectedParts = new Set();
  
  // Helper function to generate a color hash from the rig name
  const getColorFromRigName = (name) => {
    if (!name) return 'hsl(0, 0%, 75%)'; // Default gray
    
    // Simple hash function to generate a number from a string
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
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
     * Set the grouping parameter for the parts list
     * @param {string} groupBy - Group by parameter ('none', 'rig', 'type', 'status')
     */
    setGrouping: function(groupBy) {
      if (groupBy && ['none', 'rig', 'type', 'status'].includes(groupBy)) {
        currentGrouping = groupBy;
      }
    },
    
    /**
     * Get the current grouping parameter
     * @returns {string} Current grouping parameter
     */
    getGrouping: function() {
      return currentGrouping;
    },
    
    /**
     * Initialize the parts list component
     */
    init: function() {
      // Initialize bulk actions
      this.initBulkActions();
      
      // Initialize sort and group controls
      const sortBySelect = document.getElementById('sort-by');
      const sortDirectionBtn = document.getElementById('sort-direction');
      const groupBySelect = document.getElementById('group-by');
      
      // Set initial values from the current state
      if (sortBySelect) {
        // Set initial selected option
        const sortOption = sortBySelect.querySelector(`option[value="${currentSort.column}"]`);
        if (sortOption) sortOption.selected = true;
        
        // Setup sort change handler
        sortBySelect.addEventListener('change', () => {
          const column = sortBySelect.value;
          this.setSort(column, currentSort.direction);
          this.refresh();
        });
      }
      
      // Set up sort direction toggle
      if (sortDirectionBtn) {
        // Set initial direction indicator
        sortDirectionBtn.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
        
        // Setup click handler
        sortDirectionBtn.addEventListener('click', () => {
          const newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
          this.setSort(null, newDirection);
          sortDirectionBtn.textContent = newDirection === 'asc' ? '↑' : '↓';
          this.refresh();
        });
      }
      
      // Set up grouping control
      if (groupBySelect) {
        // Set initial selected option
        const groupOption = groupBySelect.querySelector(`option[value="${currentGrouping}"]`);
        if (groupOption) groupOption.selected = true;
        
        // Setup change handler
        groupBySelect.addEventListener('change', () => {
          const groupBy = groupBySelect.value;
          this.setGrouping(groupBy);
          this.refresh();
        });
      }
      
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
      
      // Set up global document click handler for group toggle
      document.addEventListener('click', (event) => {
        const toggleBtn = event.target.closest('.group-toggle');
        if (toggleBtn) {
          const header = toggleBtn.closest('.group-header');
          if (header) {
            const groupId = header.getAttribute('data-group-id');
            this.toggleGroup(groupId);
          }
        }
      });
    },
    
    /**
     * Toggle group expansion/collapse
     * @param {string} groupId - ID of the group to toggle
     */
    toggleGroup: function(groupId) {
      if (!groupId) return;
      
      const header = document.querySelector(`.group-header[data-group-id="${groupId}"]`);
      if (!header) return;
      
      const isCollapsed = header.classList.toggle('collapsed');
      
      // Toggle visibility of associated content rows
      document.querySelectorAll(`.group-content[data-group-id="${groupId}"]`).forEach(row => {
        row.classList.toggle('hidden', isCollapsed);
      });
    },
    
    /**
     * Refresh the parts list
     * @param {string} sortColumn - Column to sort by
     * @param {string} sortDirection - Sort direction ('asc' or 'desc')
     * @param {Object} filters - Filters to apply
     */
    refresh: function(sortColumn, sortDirection, filters) {
      // Clear any existing selections
      this.clearSelection();
      
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
      
      // Update active filters display
      this.updateActiveFiltersDisplay();
      
      // Update sort UI
      const sortBySelect = document.getElementById('sort-by');
      const sortDirectionBtn = document.getElementById('sort-direction');
      
      if (sortBySelect) {
        sortBySelect.value = currentSort.column;
      }
      
      if (sortDirectionBtn) {
        sortDirectionBtn.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
      }
      
      // Clear the table
      const tbody = document.querySelector('#parts-table tbody');
      DOMUtils.clearElement(tbody);
      
      try {
        // Get parts with current sort and filters
        const parts = window.PartModel ? window.PartModel.getAllParts(currentFilters, currentSort.column, currentSort.direction) : [];
        
        // Update the results count
        document.getElementById('results-count').textContent = `${parts.length} parts found`;
        
        // Handle grouping
        if (currentGrouping !== 'none' && parts.length > 0) {
          this.renderGroupedParts(tbody, parts);
        } else {
          // Render parts without grouping
          parts.forEach(part => this.renderPartRow(tbody, part));
        }
      } catch (err) {
        console.error('Error refreshing parts list:', err);
        document.getElementById('results-count').textContent = 'Error loading parts';
      }
    },
    
    /**
     * Render parts grouped by specified criteria
     * @param {HTMLElement} tbody - Table body element
     * @param {Array} parts - Array of part objects
     */
    renderGroupedParts: function(tbody, parts) {
      // Group parts by the specified grouping
      const groups = {};
      const groupInfo = {};
      
      // First phase: group parts and collect metadata
      parts.forEach(part => {
        let groupValue = '';
        let groupDisplay = '';
        
        // Determine grouping value based on current grouping
        switch (currentGrouping) {
          case 'rig':
            // For rig grouping, only include active parts in a rig
            // Parts in inactive/historical rigs should not be grouped
            if (part.status === 'active' && part.rig_name) {
              groupValue = part.rig_name;
              groupDisplay = part.rig_name;
            } else {
              // Different categories for non-rig parts
              if (part.status === 'bin') {
                groupValue = 'parts_bin';
                groupDisplay = 'Parts Bin';
              } else if (part.status === 'active') {
                groupValue = 'ungrouped_active';
                groupDisplay = 'Ungrouped Active Parts';
              } else {
                groupValue = 'disposed';
                groupDisplay = 'Disposed Parts';
              }
            }
            break;
            
          case 'type':
            groupValue = part.type;
            groupDisplay = part.type.charAt(0).toUpperCase() + part.type.slice(1);
            break;
            
          case 'status':
            groupValue = part.status;
            groupDisplay = part.status.charAt(0).toUpperCase() + part.status.slice(1);
            break;
            
          default:
            groupValue = 'all';
            groupDisplay = 'All Parts';
        }
        
        // Initialize group if not exists
        if (!groups[groupValue]) {
          groups[groupValue] = [];
          groupInfo[groupValue] = {
            display: groupDisplay,
            count: 0,
            metadata: {}
          };
          
          // For rig grouping, initialize rig metadata
          if (currentGrouping === 'rig' && part.rig_name) {
            groupInfo[groupValue].metadata.rigName = part.rig_name;
            groupInfo[groupValue].metadata.color = getColorFromRigName(part.rig_name);
          }
        }
        
        // Add part to its group
        groups[groupValue].push(part);
        groupInfo[groupValue].count++;
        
        // Collect additional rig metadata if applicable
        if (currentGrouping === 'rig' && part.rig_name && part.type === 'motherboard') {
          groupInfo[groupValue].metadata.motherboard = `${part.brand} ${part.model}`;
          groupInfo[groupValue].metadata.motherboardId = part.id;
        }
      });
      
      // Second phase: render each group
      Object.keys(groups).forEach(groupValue => {
        const groupParts = groups[groupValue];
        const info = groupInfo[groupValue];
        
        // Skip empty groups
        if (groupParts.length === 0) return;
        
        // Create a unique ID for this group
        const groupId = `group-${groupValue.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
        
        // Render group header
        this.renderGroupHeader(tbody, groupId, info);
        
        // Render parts within this group
        groupParts.forEach(part => {
          // Create a class name for the group content
          const row = this.renderPartRow(tbody, part, {
            groupId,
            isGrouped: true,
            groupColor: info.metadata.color
          });
        });
      });
    },
    
    /**
     * Render a group header
     * @param {HTMLElement} tbody - Table body element
     * @param {string} groupId - Group ID
     * @param {Object} info - Group information
     */
    renderGroupHeader: function(tbody, groupId, info) {
      const colCount = document.querySelectorAll('#parts-table th').length;
      
      // Create header row
      const headerRow = DOMUtils.createElement('tr', {
        className: currentGrouping === 'rig' ? 'group-header rig-group-header' : 'group-header',
        dataset: { groupId }
      });
      
      // If this is a rig group and has a color, set the left border color
      if (currentGrouping === 'rig' && info.metadata && info.metadata.color) {
        headerRow.style.borderLeftColor = info.metadata.color;
      }
      
      // Create the content cell that spans all columns
      const cell = DOMUtils.createElement('td', {
        colSpan: colCount
      });
      
      // Create group header content
      const headerContent = DOMUtils.createElement('div', {
        className: 'group-name'
      });
      
      // Add toggle button
      const toggleBtn = DOMUtils.createElement('span', {
        className: 'group-toggle'
      }, '▼');
      headerContent.appendChild(toggleBtn);
      
      // Add group name and count
      const nameSpan = DOMUtils.createElement('span', {}, `${info.display} (${info.count})`);
      headerContent.appendChild(nameSpan);
      
      // Add group info if we have metadata
      if (info.metadata) {
        let infoText = '';
        
        // For rig groups, show the motherboard info
        if (currentGrouping === 'rig' && info.metadata.motherboard) {
          infoText = `Motherboard: ${info.metadata.motherboard}`;
        }
        
        if (infoText) {
          const infoSpan = DOMUtils.createElement('span', {
            className: 'group-info'
          }, infoText);
          headerContent.appendChild(infoSpan);
        }
      }
      
      // Add actions for certain group types
      if (currentGrouping === 'rig' && info.metadata && info.metadata.motherboardId) {
        const actionsContainer = DOMUtils.createElement('div', {
          className: 'group-actions'
        });
        
        // Rename rig action
        const renameAction = DOMUtils.createButton('Rename Rig', 'compact-btn', () => {
          if (window.RigController && typeof window.RigController.showRigIdentityForm === 'function') {
            window.RigController.showRigIdentityForm(info.metadata.motherboardId, info.metadata.rigName);
          }
        });
        
        actionsContainer.appendChild(renameAction);
        cell.appendChild(actionsContainer);
      }
      
      // Add content to the cell
      cell.appendChild(headerContent);
      headerRow.appendChild(cell);
      
      // Add row to table
      tbody.appendChild(headerRow);
    },
    
    /**
     * Render a part row
     * @param {HTMLElement} tbody - Table body element
     * @param {Object} part - Part data
     * @param {Object} groupOptions - Group options for rendering (optional)
     * @returns {HTMLElement} The created row
     */
    renderPartRow: function(tbody, part, groupOptions = {}) {
      // Create row with appropriate classes for grouping
      const rowClasses = [];
      
      if (part.is_deleted) {
        rowClasses.push('deleted-part');
      }
      
      if (groupOptions.isGrouped) {
        rowClasses.push('grouped-row');
        rowClasses.push('group-content');
      }
      
      const row = DOMUtils.createElement('tr', {
        className: rowClasses.join(' '),
        dataset: { 
          id: part.id,
          groupId: groupOptions.groupId || ''
        }
      });
      
      // Apply group color to row border if applicable
      if (groupOptions.isGrouped && groupOptions.groupColor) {
        row.style.borderLeftColor = groupOptions.groupColor;
      }
      
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
        if (window.PartController && typeof window.PartController.showPartEditForm === 'function') {
          window.PartController.showPartEditForm(part.id);
        } else {
          console.error('PartController.showPartEditForm is not available');
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
      
      // Selection cell with checkbox
      const selectCell = DOMUtils.createElement('td', { className: 'select-cell' });
      const checkbox = DOMUtils.createElement('input', {
        type: 'checkbox',
        className: 'part-checkbox',
        dataset: {
          partId: part.id,
          partStatus: part.status,
          isConnected: part.active_connections > 0 ? 'true' : 'false',
          partType: part.type
        }
      });
      
      // Add event listener for checkbox
      checkbox.addEventListener('change', (e) => {
        // Toggle selection
        if (e.target.checked) {
          // Add to selected set
          selectedParts.add(part.id);
          row.classList.add('selected');
          
          // If this is a motherboard, show a warning toast only when bulk connect button exists and is enabled
          if (part.type === 'motherboard' && document.getElementById('bulk-connect-btn') && 
              !document.getElementById('bulk-connect-btn').disabled) {
            window.DOMUtils.showToast('Motherboards cannot be connected to other motherboards', 'warning');
          }
        } else {
          // Remove from selected set
          selectedParts.delete(part.id);
          row.classList.remove('selected');
        }
        
        // Update the bulk actions UI
        this.updateBulkActionsUI();
      });
      
      selectCell.appendChild(checkbox);
      
      // Add cells to row in the new order (select, actions, then other cells)
      row.appendChild(selectCell);
      row.appendChild(actionsCell);
      row.appendChild(typeCell);
      row.appendChild(brandCell);
      row.appendChild(modelCell);
      row.appendChild(acquisitionCell);
      row.appendChild(statusCell);
      row.appendChild(notesCell);
      
      // Add row to table body
      tbody.appendChild(row);
      
      // Return the row for potential use in grouping logic
      return row;
    },
    
    /**
     * Update the bulk actions UI based on selected parts
     */
    updateBulkActionsUI: function() {
      const bulkActionsBar = document.getElementById('bulk-actions-bar');
      const selectedCount = document.getElementById('selected-count');
      const connectBtn = document.getElementById('bulk-connect-btn');
      const disconnectBtn = document.getElementById('bulk-disconnect-btn');
      
      const count = selectedParts.size;
      
      // Show/hide bulk actions bar
      if (count > 0) {
        bulkActionsBar.classList.remove('hidden');
        selectedCount.textContent = count;
        
        // Check if all selected parts can be connected (not connected yet, not deleted, and not motherboards)
        const allCheckboxes = document.querySelectorAll('.part-checkbox:checked');
        const canAllConnect = Array.from(allCheckboxes).every(cb => 
          cb.dataset.isConnected === 'false' && 
          cb.dataset.partStatus !== 'deleted' &&
          cb.dataset.partType !== 'motherboard'
        );
        
        // Check if all selected parts can be disconnected (are connected)
        const canAllDisconnect = Array.from(allCheckboxes).every(cb => 
          cb.dataset.isConnected === 'true'
        );
        
        // Enable/disable buttons based on state
        connectBtn.disabled = !canAllConnect;
        disconnectBtn.disabled = !canAllDisconnect;
      } else {
        // Hide the bulk actions bar if no parts are selected
        bulkActionsBar.classList.add('hidden');
      }
    },
    
    /**
     * Initialize bulk actions
     */
    initBulkActions: function() {
      // Cancel bulk selection
      document.getElementById('bulk-cancel-btn').addEventListener('click', () => {
        this.clearSelection();
      });
      
      // Bulk connect
      document.getElementById('bulk-connect-btn').addEventListener('click', () => {
        if (selectedParts.size === 0) return;
        
        // Show a modal to select the motherboard and shared connection date
        this.showBulkConnectForm(Array.from(selectedParts));
      });
      
      // Bulk disconnect
      document.getElementById('bulk-disconnect-btn').addEventListener('click', () => {
        if (selectedParts.size === 0) return;
        
        // Show a modal to select the shared disconnection date
        this.showBulkDisconnectForm(Array.from(selectedParts));
      });
      
      // Bulk dispose
      document.getElementById('bulk-dispose-btn').addEventListener('click', () => {
        if (selectedParts.size === 0) return;
        
        // Show a modal to select the shared disposal date and reason
        this.showBulkDisposeForm(Array.from(selectedParts));
      });
      
      // Bulk delete (admin function)
      document.getElementById('bulk-delete-btn').addEventListener('click', () => {
        if (selectedParts.size === 0) return;
        
        // Confirm the bulk delete action
        DOMUtils.showConfirmDialog(
          `Are you sure you want to permanently delete ${selectedParts.size} parts? This will remove them and all their history from the database.`,
          () => {
            this.performBulkDelete(Array.from(selectedParts));
          }
        );
      });
    },
    
    /**
     * Clear all selections
     */
    clearSelection: function() {
      // Uncheck all checkboxes
      document.querySelectorAll('.part-checkbox:checked').forEach(checkbox => {
        checkbox.checked = false;
      });
      
      // Remove selected class from all rows
      document.querySelectorAll('tr.selected').forEach(row => {
        row.classList.remove('selected');
      });
      
      // Clear the selection set
      selectedParts.clear();
      
      // Hide the bulk actions bar
      document.getElementById('bulk-actions-bar').classList.add('hidden');
    },
    
    /**
     * Show the bulk connect form
     * @param {Array} partIds - Array of part IDs to connect
     */
    showBulkConnectForm: function(partIds) {
      if (!window.ConnectionController || typeof window.ConnectionController.showBulkConnectForm !== 'function') {
        // Fallback if bulk connect method doesn't exist (to be implemented)
        window.ConnectionController.showConnectOptions(partIds[0]);
        return;
      }
      
      // Call the bulk connect method in ConnectionController
      window.ConnectionController.showBulkConnectForm(partIds);
    },
    
    /**
     * Show the bulk disconnect form
     * @param {Array} partIds - Array of part IDs to disconnect
     */
    showBulkDisconnectForm: function(partIds) {
      if (!window.ConnectionController || typeof window.ConnectionController.showBulkDisconnectForm !== 'function') {
        // Fallback if bulk disconnect method doesn't exist (to be implemented)
        window.ConnectionController.showDisconnectOptions(partIds[0]);
        return;
      }
      
      // Call the bulk disconnect method in ConnectionController
      window.ConnectionController.showBulkDisconnectForm(partIds);
    },
    
    /**
     * Show the bulk dispose form
     * @param {Array} partIds - Array of part IDs to dispose
     */
    showBulkDisposeForm: function(partIds) {
      if (!window.DisposalController || typeof window.DisposalController.showBulkDisposeForm !== 'function') {
        // Fallback if bulk dispose method doesn't exist (to be implemented)
        window.DisposalController.showDisposePartForm(partIds[0]);
        return;
      }
      
      // Call the bulk dispose method in DisposalController
      window.DisposalController.showBulkDisposeForm(partIds);
    },
    
    /**
     * Perform bulk delete operation
     * @param {Array} partIds - Array of part IDs to delete
     */
    performBulkDelete: function(partIds) {
      if (!window.PartModel || typeof window.PartModel.hardDeletePart !== 'function') {
        console.error('PartModel.hardDeletePart is not available');
        return;
      }
      
      // Delete each part
      let successCount = 0;
      
      partIds.forEach(partId => {
        try {
          window.PartModel.hardDeletePart(partId);
          successCount++;
        } catch (err) {
          console.error(`Error deleting part ${partId}:`, err);
        }
      });
      
      // Show toast with results
      if (successCount > 0) {
        window.DOMUtils.showToast(`${successCount} parts deleted successfully`, 'success');
      } else {
        window.DOMUtils.showToast('Failed to delete parts', 'error');
      }
      
      // Clear selection and refresh the list
      this.clearSelection();
      this.refresh();
    },
    
    /**
     * Update the active filters display
     */
    updateActiveFiltersDisplay: function() {
      const display = document.getElementById('active-filters-display');
      const activeFilters = [];
      
      // Filters
      if (currentFilters.type && currentFilters.type !== 'all') {
        activeFilters.push(`Type: ${currentFilters.type}`);
      }
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        activeFilters.push(`Status: ${currentFilters.status}`);
      }
      
      if (currentFilters.search && currentFilters.search.trim() !== '') {
        activeFilters.push(`Search: "${currentFilters.search}"`);
      }
      
      // Grouping info
      if (currentGrouping !== 'none') {
        const groupCapitalized = currentGrouping.charAt(0).toUpperCase() + currentGrouping.slice(1);
        activeFilters.push(`Grouped by: ${groupCapitalized}`);
      }
      
      // Sorting info
      const sortCapitalized = currentSort.column.replace(/_/g, ' ').split(' ').map(
        word => word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      activeFilters.push(`Sorted by: ${sortCapitalized} (${currentSort.direction === 'asc' ? 'ascending' : 'descending'})`);
      
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