// Initialize SQL.js
let db;
let SQL;
let fileHandle = null;
let hasUnsavedChanges = false;
// Admin controls are always available now
const currentYear = new Date().getFullYear();

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  // Load SQL.js
  window.initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  }).then(sql => {
    SQL = sql;
    setupEventListeners();
    populateDateSelects();
    setupTabNavigation();
  }).catch(err => {
    console.error('Error loading SQL.js:', err);
    alert('Failed to load SQL.js. Please refresh the page and try again.');
  });
});

// Populate date selects with years and days
function populateDateSelects() {
  // Populate acquisition year dropdowns
  const yearSelects = [
    document.getElementById('part-acquisition-year'),
    document.getElementById('edit-part-acquisition-year'),
    document.getElementById('date-year')
  ];
  
  // Add years from 2000 to current year
  yearSelects.forEach(select => {
    if (!select) return;
    for (let year = currentYear; year >= 2000; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      select.appendChild(option);
    }
  });
  
  // Populate day dropdowns
  const daySelects = [
    document.getElementById('part-acquisition-day'),
    document.getElementById('edit-part-acquisition-day'),
    document.getElementById('date-day')
  ];
  
  daySelects.forEach(select => {
    if (!select) return;
    for (let day = 1; day <= 31; day++) {
      const option = document.createElement('option');
      option.value = day;
      option.textContent = day;
      select.appendChild(option);
    }
  });
  
  // Update days when month changes to show correct number of days
  const monthSelects = [
    document.getElementById('part-acquisition-month'),
    document.getElementById('edit-part-acquisition-month'),
    document.getElementById('date-month')
  ];
  
  monthSelects.forEach((select, index) => {
    if (!select) return;
    select.addEventListener('change', () => updateDaysInMonth(select, daySelects[index]));
  });
}

// Update days in month select based on selected month
function updateDaysInMonth(monthSelect, daySelect) {
  if (!monthSelect || !daySelect) return;
  
  const month = parseInt(monthSelect.value, 10);
  const yearSelect = monthSelect.id.includes('part-acquisition') ? 
    document.getElementById(monthSelect.id.replace('month', 'year')) :
    document.getElementById('date-year');
  const year = parseInt(yearSelect.value, 10) || currentYear;
  
  // Clear days
  const selectedDay = daySelect.value;
  daySelect.innerHTML = '<option value="">Day (optional)</option>';
  
  if (month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const option = document.createElement('option');
      option.value = day;
      option.textContent = day;
      if (day.toString() === selectedDay) {
        option.selected = true;
      }
      daySelect.appendChild(option);
    }
  }
}

// Setup tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show the selected tab content
      tabContents.forEach(content => {
        if (content.id === tabId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
      
      // If switching to the rigs tab, refresh rigs
      if (tabId === 'rigs-tab') {
        refreshRigs();
      }
      
      // If switching to the parts bin tab, refresh parts bin
      if (tabId === 'parts-bin-tab') {
        refreshPartsBin();
      }
    });
  });
}

// Set up event listeners
function setupEventListeners() {
  // Open database button
  document.getElementById('open-db').addEventListener('click', openDatabase);
  
  // Create database button
  document.getElementById('create-db').addEventListener('click', createNewDatabase);
  
  // Add part button - opens modal
  document.getElementById('add-part-button').addEventListener('click', () => {
    document.getElementById('add-part-modal').style.display = 'block';
  });
  
  // Close add part modal
  document.getElementById('close-add-part').addEventListener('click', () => {
    document.getElementById('add-part-modal').style.display = 'none';
  });
  
  // Add part form
  document.getElementById('part-form').addEventListener('submit', function(event) {
    addPart(event);
    document.getElementById('add-part-modal').style.display = 'none';
  });
  
  // Edit part form
  document.getElementById('edit-part-form').addEventListener('submit', savePartEdit);
  
  // Cancel edit button
  document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
  
  // View part timeline buttons
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('view-timeline')) {
      const partId = e.target.getAttribute('data-id');
      if (partId) {
        showPartTimeline(partId);
      }
    }
  });
  
  // Back to parts button in timeline view
  document.getElementById('back-to-parts').addEventListener('click', () => {
    document.getElementById('part-timeline-view').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
  });
  
  // Date modal form
  document.getElementById('date-form').addEventListener('submit', handleDateFormSubmit);
  document.querySelector('#date-modal .close').addEventListener('click', () => {
    document.getElementById('date-modal').style.display = 'none';
  });
  
  // Parts bin filter
  document.getElementById('part-bin-filter-type').addEventListener('change', refreshPartsBin);
  document.getElementById('refresh-parts-bin').addEventListener('click', refreshPartsBin);
  
  // No more Alt key for admin controls - they're always available
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Set up parts list sorting
  document.querySelectorAll('#parts-table th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort');
      const currentDirection = currentSort.column === column ? currentSort.direction : 'desc';
      // Toggle direction if clicking on the same column
      const newDirection = (currentSort.column === column && currentDirection === 'asc') ? 'desc' : 'asc';
      refreshPartsList(column, newDirection);
    });
  });
  
  // Set up filter controls
  document.getElementById('apply-filters').addEventListener('click', () => {
    const typeFilter = document.getElementById('filter-type').value;
    const statusFilter = document.getElementById('filter-status').value;
    const searchFilter = document.getElementById('filter-search').value.trim();
    
    refreshPartsList(null, null, {
      type: typeFilter,
      status: statusFilter,
      search: searchFilter
    });
    
    // Show toast notification about applied filters
    let filterMessage = 'Filters applied';
    if (typeFilter !== 'all' || statusFilter !== 'all' || searchFilter !== '') {
      filterMessage += ': ';
      const activeFilters = [];
      if (typeFilter !== 'all') activeFilters.push(`Type: ${typeFilter}`);
      if (statusFilter !== 'all') activeFilters.push(`Status: ${statusFilter}`);
      if (searchFilter !== '') activeFilters.push(`Search: "${searchFilter}"`);
      filterMessage += activeFilters.join(', ');
    }
    showToast(filterMessage, 'success');
  });
  
  // Clear filters button
  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-search').value = '';
    
    refreshPartsList(null, null, {
      type: 'all',
      status: 'all',
      search: ''
    });
    
    showToast('Filters cleared', 'success');
  });
  
  // Search on enter key
  document.getElementById('filter-search').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('apply-filters').click();
    }
  });
}

// Open an existing database file
async function openDatabase() {
  try {
    // Check if the File System Access API is available
    if (!window.showOpenFilePicker) {
      alert('Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.');
      return;
    }
    
    // Open file picker
    const opts = {
      types: [
        {
          description: 'SQLite Database',
          accept: {
            'application/x-sqlite3': ['.sqlite', '.db', '.sqlite3']
          }
        }
      ],
      excludeAcceptAllOption: false,
      multiple: false
    };
    
    // Get a file handle
    [fileHandle] = await window.showOpenFilePicker(opts);
    
    // Get the file
    const file = await fileHandle.getFile();
    
    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a database from the file
    db = new SQL.Database(new Uint8Array(arrayBuffer));
    
    // Update UI
    updateFileInfo(file.name);
    showAppUI();
    updateFilterTypeOptions(); // Add this
    refreshPartsList();
    populateBrandSuggestions();
    hasUnsavedChanges = false;
    updateSaveStatus();
    
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error opening database:', err);
      alert('Error opening database: ' + err.message);
    }
  }
}

// Create a new database file
async function createNewDatabase() {
  try {
    // Check if the File System Access API is available
    if (!window.showSaveFilePicker) {
      alert('Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.');
      return;
    }
    
    // Open file picker for saving
    const opts = {
      types: [
        {
          description: 'SQLite Database',
          accept: {
            'application/x-sqlite3': ['.sqlite']
          }
        }
      ],
      suggestedName: 'pc-history.sqlite',
      excludeAcceptAllOption: false
    };
    
    // Get a file handle for saving
    fileHandle = await window.showSaveFilePicker(opts);
    
    // Create a new database
    db = new SQL.Database();
    
    // Create the parts table with acquisition date and precision
    db.run(`
      CREATE TABLE parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        is_deleted BOOLEAN DEFAULT 0,
        acquisition_date TEXT,
        date_precision TEXT DEFAULT "none",
        UNIQUE(brand, model)
      )
    `);
    
    // Create the connections table - the heart of our graph
    db.run(`
      CREATE TABLE connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_id INTEGER NOT NULL,
        motherboard_id INTEGER NOT NULL,
        connected_at TEXT NOT NULL,
        connected_precision TEXT DEFAULT "day",
        disconnected_at TEXT,
        disconnected_precision TEXT DEFAULT "day",
        notes TEXT,
        FOREIGN KEY (part_id) REFERENCES parts(id),
        FOREIGN KEY (motherboard_id) REFERENCES parts(id)
      )
    `);
    
    // Create the rig identities table
    db.run(`
      CREATE TABLE rig_identities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        motherboard_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        active_from TEXT NOT NULL,
        active_from_precision TEXT DEFAULT "day",
        active_until TEXT,
        active_until_precision TEXT DEFAULT "day",
        notes TEXT,
        FOREIGN KEY (motherboard_id) REFERENCES parts(id)
      )
    `);
    
    // Create the part disposal table
    db.run(`
      CREATE TABLE disposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_id INTEGER NOT NULL,
        disposed_at TEXT NOT NULL,
        disposed_precision TEXT DEFAULT "day",
        reason TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (part_id) REFERENCES parts(id)
      )
    `);
    
    // Save the database to the file
    await saveToFile();
    
    // Update UI
    const file = await fileHandle.getFile();
    updateFileInfo(file.name);
    showAppUI();
    updateFilterTypeOptions(); // Add this
    refreshPartsList();
    populateBrandSuggestions();
    
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error creating database:', err);
      alert('Error creating database: ' + err.message);
    }
  }
}

// Show a toast notification
function showToast(message, type = 'default') {
  const toastContainer = document.getElementById('toast-container');
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Auto-remove after animation completes (3.3s)
  setTimeout(() => {
    toast.remove();
  }, 3300);
  
  return toast;
}

async function saveToFile() {
  if (!db || !fileHandle) return;
  
  try {
    // Export the database to a Uint8Array
    const data = db.export();
    const buffer = new Uint8Array(data);
    
    // Create a writable stream
    const writable = await fileHandle.createWritable();
    
    // Write the data
    await writable.write(buffer);
    
    // Close the stream
    await writable.close();
    
    // Update UI
    hasUnsavedChanges = false;
    updateSaveStatus();
    
    console.log('Database saved to file');
  } catch (err) {
    console.error('Error saving to file:', err);
    alert('Error saving to file: ' + err.message);
  }
}

// Add a new part
async function addPart(event) {
  event.preventDefault();
  
  if (!db) {
    showToast('Please open or create a database first.', 'error');
    return;
  }
  
  const brand = document.getElementById('part-brand').value;
  const model = document.getElementById('part-model').value;
  const type = document.getElementById('part-type').value;
  const notes = document.getElementById('part-notes').value;
  
  // Get acquisition date with proper precision
  const yearSelect = document.getElementById('part-acquisition-year');
  const monthSelect = document.getElementById('part-acquisition-month');
  const daySelect = document.getElementById('part-acquisition-day');
  
  const year = yearSelect.value ? parseInt(yearSelect.value) : null;
  const month = monthSelect.value ? parseInt(monthSelect.value) : null;
  const day = daySelect.value ? parseInt(daySelect.value) : null;
  
  // Determine date precision
  let datePrecision = 'none';
  if (year) {
    datePrecision = 'year';
    if (month) {
      datePrecision = 'month';
      if (day) {
        datePrecision = 'day';
      }
    }
  }
  
  // Format acquisition date for storage
  let acquisitionDate = null;
  if (year) {
    if (datePrecision === 'day' && month && day) {
      acquisitionDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else if (datePrecision === 'month' && month) {
      acquisitionDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    } else if (datePrecision === 'year') {
      acquisitionDate = `${year}-01-01`;
    }
  }
  
  try {
    // Insert the part into the database
    db.run(
      'INSERT INTO parts (brand, model, type, notes, acquisition_date, date_precision) VALUES (?, ?, ?, ?, ?, ?)',
      [brand, model, type, notes, acquisitionDate, datePrecision]
    );
    
    // Reset the form
    document.getElementById('part-form').reset();
    
    // Refresh the parts list - keep current filters and sorting
    refreshPartsList();
    
    // Update brand suggestions
    populateBrandSuggestions();
    
    // Update filter options based on new parts
    updateFilterTypeOptions();
    
    // Mark as unsaved
    hasUnsavedChanges = true;
    updateSaveStatus();
    
    // Save to file automatically
    await saveToFile();
    
    // Show success notification
    showToast(`Added new ${type}: ${brand} ${model}`, 'success');
    
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      showToast('A part with this brand and model already exists.', 'error');
    } else if (err.message.includes('no such column')) {
      // If the database schema doesn't have the new columns yet, alter the table
      try {
        db.run('ALTER TABLE parts ADD COLUMN acquisition_date TEXT');
        db.run('ALTER TABLE parts ADD COLUMN date_precision TEXT DEFAULT "none"');
        
        // Try again with the new schema
        db.run(
          'INSERT INTO parts (brand, model, type, notes, acquisition_date, date_precision) VALUES (?, ?, ?, ?, ?, ?)',
          [brand, model, type, notes, acquisitionDate, datePrecision]
        );
        
        // Reset the form
        document.getElementById('part-form').reset();
        
        // Refresh the parts list
        refreshPartsList();
        
        // Update brand suggestions
        populateBrandSuggestions();
        
        // Mark as unsaved
        hasUnsavedChanges = true;
        updateSaveStatus();
        
        // Save to file automatically
        await saveToFile();
      } catch (alterErr) {
        console.error('Error altering table:', alterErr);
        showToast('Error updating database schema: ' + alterErr.message, 'error');
      }
    } else {
      console.error('Error adding part:', err);
      showToast('Error adding part: ' + err.message, 'error');
    }
  }
}

// Mark a part as deleted (soft delete)
async function deletePart(id) {
  if (confirm('Are you sure you want to mark this part as deleted? This is used for parts that are sold, destroyed, or otherwise no longer in your possession.')) {
    try {
      // Check if the part has active connections first
      const activeConnections = db.exec(`
        SELECT COUNT(*) FROM connections 
        WHERE (part_id = ${id} OR motherboard_id = ${id}) 
        AND disconnected_at IS NULL
      `);
      
      const count = activeConnections[0]?.values[0][0] || 0;
      
      if (count > 0) {
        if (!confirm(`This part has ${count} active connections. Marking it as deleted will also disconnect all connections. Continue?`)) {
          return;
        }
      }
      
      // Show the date modal for the disposal date
      // No callback - let the normal form submission handle it
      showDateModal('dispose', id, 'Disposal Date');
      
    } catch (err) {
      console.error('Error preparing to delete part:', err);
      alert('Error preparing to delete part: ' + err.message);
    }
  }
}

// Hard delete a part from history (admin function)
async function hardDeletePart(id) {
  if (confirm('Are you sure you want to PERMANENTLY delete this part and all its history from the database? This will remove the part and all associated events completely. This cannot be undone!')) {
    try {
      // Delete connections first to maintain referential integrity
      db.run('DELETE FROM connections WHERE part_id = ? OR motherboard_id = ?', [id, id]);
      
      // Delete rig identities if this is a motherboard
      db.run('DELETE FROM rig_identities WHERE motherboard_id = ?', [id]);
      
      // Delete the part
      db.run('DELETE FROM parts WHERE id = ?', [id]);
      
      // Refresh the parts list - keep current filters and sorting
      refreshPartsList();
      
      // Update filter options based on remaining parts
      updateFilterTypeOptions();
      
      // Mark as unsaved
      hasUnsavedChanges = true;
      updateSaveStatus();
      
      // Save to file automatically
      await saveToFile();
      
    } catch (err) {
      console.error('Error permanently deleting part:', err);
      alert('Error permanently deleting part: ' + err.message);
    }
  }
}

// Show edit form for a part
function editPart(id) {
  try {
    // Get the part from the database using a direct query instead of prepare/bind
    const result = db.exec(`SELECT * FROM parts WHERE id = ${id}`);
    
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('Part not found');
    }
    
    // Get column names and part data
    const columns = result[0].columns;
    const partData = result[0].values[0];
    
    // Create part object from column names and values
    const part = {};
    columns.forEach((col, index) => {
      part[col] = partData[index];
    });
    
    console.log('Editing part:', part);
    
    // Populate the edit form
    document.getElementById('edit-part-id').value = part.id;
    document.getElementById('edit-part-brand').value = part.brand;
    document.getElementById('edit-part-model').value = part.model;
    document.getElementById('edit-part-type').value = part.type;
    document.getElementById('edit-part-notes').value = part.notes || '';
    
    // Populate acquisition date selects if available
    if (part.acquisition_date) {
      const dateParts = part.acquisition_date.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = part.date_precision === 'year' ? '' : parseInt(dateParts[1], 10);
      const day = part.date_precision === 'day' ? parseInt(dateParts[2], 10) : '';
      
      const yearSelect = document.getElementById('edit-part-acquisition-year');
      const monthSelect = document.getElementById('edit-part-acquisition-month');
      const daySelect = document.getElementById('edit-part-acquisition-day');
      
      // Set the year
      if (yearSelect) {
        for (let i = 0; i < yearSelect.options.length; i++) {
          if (parseInt(yearSelect.options[i].value, 10) === year) {
            yearSelect.selectedIndex = i;
            break;
          }
        }
      }
      
      // Set the month if precision is month or day
      if (part.date_precision === 'month' || part.date_precision === 'day') {
        if (monthSelect) {
          monthSelect.value = month;
        }
      } else {
        // Reset month if precision is year
        if (monthSelect) {
          monthSelect.value = '';
        }
      }
      
      // Set the day if precision is day
      if (part.date_precision === 'day') {
        // Make sure days are populated for the month
        updateDaysInMonth(monthSelect, daySelect);
        if (daySelect) {
          daySelect.value = day;
        }
      } else {
        // Reset day if precision is year or month
        if (daySelect) {
          daySelect.value = '';
        }
      }
    }
    
    // Show the edit form
    document.getElementById('edit-form').classList.remove('hidden');
    
    // Scroll to the top
    window.scrollTo(0, 0);
    
  } catch (err) {
    console.error('Error editing part:', err);
    alert('Error editing part: ' + err.message);
  }
}

// Save edited part
async function savePartEdit(event) {
  event.preventDefault();
  
  const id = parseInt(document.getElementById('edit-part-id').value, 10);
  const brand = document.getElementById('edit-part-brand').value;
  const model = document.getElementById('edit-part-model').value;
  const type = document.getElementById('edit-part-type').value;
  const notes = document.getElementById('edit-part-notes').value;
  
  // Get acquisition date with proper precision
  const yearSelect = document.getElementById('edit-part-acquisition-year');
  const monthSelect = document.getElementById('edit-part-acquisition-month');
  const daySelect = document.getElementById('edit-part-acquisition-day');
  
  const year = yearSelect.value ? parseInt(yearSelect.value) : null;
  const month = monthSelect.value ? parseInt(monthSelect.value) : null;
  const day = daySelect.value ? parseInt(daySelect.value) : null;
  
  // Determine date precision
  let datePrecision = 'none';
  if (year) {
    datePrecision = 'year';
    if (month) {
      datePrecision = 'month';
      if (day) {
        datePrecision = 'day';
      }
    }
  }
  
  // Format acquisition date for storage
  let acquisitionDate = null;
  if (year) {
    if (datePrecision === 'day' && month && day) {
      acquisitionDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else if (datePrecision === 'month' && month) {
      acquisitionDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    } else if (datePrecision === 'year') {
      acquisitionDate = `${year}-01-01`;
    }
  }
  
  console.log('Saving part with ID:', id, 'Brand:', brand);
  
  try {
    // Update the part in the database
    db.run(
      'UPDATE parts SET brand = ?, model = ?, type = ?, notes = ?, acquisition_date = ?, date_precision = ? WHERE id = ?',
      [brand, model, type, notes, acquisitionDate, datePrecision, id]
    );
    
    // Verify the update worked by fetching the part
    const result = db.exec(`SELECT * FROM parts WHERE id = ${id}`);
    if (result.length > 0) {
      console.log('Updated part:', result[0].values[0]);
    }
    
    // Hide the edit form
    document.getElementById('edit-form').classList.add('hidden');
    
    // Refresh the parts list - keep current filters and sorting
    refreshPartsList();
    
    // Update brand suggestions
    populateBrandSuggestions();
    
    // Update filter options based on edited parts
    updateFilterTypeOptions();
    
    // Mark as unsaved
    hasUnsavedChanges = true;
    updateSaveStatus();
    
    // Save to file automatically
    await saveToFile();
    
    // Show success toast
    showToast('Part updated successfully', 'success');
    
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      showToast('A part with this brand and model already exists.', 'error');
    } else if (err.message.includes('no such column')) {
      // If the database schema doesn't have the new columns yet, alter the table
      try {
        db.run('ALTER TABLE parts ADD COLUMN acquisition_date TEXT');
        db.run('ALTER TABLE parts ADD COLUMN date_precision TEXT DEFAULT "none"');
        
        // Try again with the new schema
        db.run(
          'UPDATE parts SET brand = ?, model = ?, type = ?, notes = ?, acquisition_date = ?, date_precision = ? WHERE id = ?',
          [brand, model, type, notes, acquisitionDate, datePrecision, id]
        );
        
        // Hide the edit form
        document.getElementById('edit-form').classList.add('hidden');
        
        // Refresh the parts list
        refreshPartsList();
        
        // Update brand suggestions
        populateBrandSuggestions();
        
        // Mark as unsaved
        hasUnsavedChanges = true;
        updateSaveStatus();
        
        // Save to file automatically
        await saveToFile();
        
        // Show success toast
        showToast('Part updated successfully', 'success');
      } catch (alterErr) {
        console.error('Error altering table:', alterErr);
        showToast('Error updating database schema: ' + alterErr.message, 'error');
      }
    } else {
      console.error('Error updating part:', err);
      showToast('Error updating part: ' + err.message, 'error');
    }
  }
}

// Cancel editing a part
function cancelEdit() {
  document.getElementById('edit-form').classList.add('hidden');
}

// Populate brand suggestions for autocomplete
function populateBrandSuggestions() {
  if (!db) return;
  
  try {
    // Query all unique brands from the database
    const result = db.exec('SELECT DISTINCT brand FROM parts ORDER BY brand ASC');
    
    if (result.length > 0 && result[0].values.length > 0) {
      const brands = result[0].values.map(row => row[0]);
      const datalist = document.getElementById('brand-suggestions');
      
      // Clear existing options
      datalist.innerHTML = '';
      
      // Add each brand as an option
      brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        datalist.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Error populating brand suggestions:', err);
  }
}

// Variables to track current sort and filter state
let currentSort = { column: 'brand', direction: 'asc' };
let currentFilters = { type: 'all', status: 'all', search: '' };

// Refresh the parts list
function refreshPartsList(sortColumn, sortDirection, filters) {
  if (!db) return;
  
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
  updateActiveFiltersDisplay();
  
  const tbody = document.querySelector('#parts-table tbody');
  tbody.innerHTML = '';
  
  try {
    // Build WHERE clause based on filters
    let whereClause = '';
    const whereConditions = [];
    
    // Type filter
    if (currentFilters.type && currentFilters.type !== 'all') {
      whereConditions.push(`p.type = '${currentFilters.type}'`);
    }
    
    // Status filter
    if (currentFilters.status && currentFilters.status !== 'all') {
      switch (currentFilters.status) {
        case 'active':
          whereConditions.push(`
            ((p.type = 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL))
            OR
            (p.type != 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL)))
            AND p.is_deleted = 0
          `);
          break;
        case 'bin':
          whereConditions.push(`
            NOT EXISTS (
              SELECT 1 FROM connections c 
              WHERE (c.part_id = p.id OR c.motherboard_id = p.id) 
              AND c.disconnected_at IS NULL
            )
            AND p.is_deleted = 0
          `);
          break;
        case 'deleted':
          whereConditions.push(`p.is_deleted = 1`);
          break;
      }
    }
    
    // Search filter
    if (currentFilters.search && currentFilters.search.trim() !== '') {
      const searchTerm = currentFilters.search.trim().replace(/'/g, "''"); // Escape single quotes
      whereConditions.push(`
        (p.brand LIKE '%${searchTerm}%' OR 
         p.model LIKE '%${searchTerm}%' OR 
         p.notes LIKE '%${searchTerm}%')
      `);
    }
    
    // Combine all WHERE conditions
    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }
    
    // Build ORDER BY clause based on sort
    let orderByClause = '';
    
    switch (currentSort.column) {
      case 'id':
        orderByClause = `p.id ${currentSort.direction}`;
        break;
      case 'brand':
        orderByClause = `p.brand ${currentSort.direction}, p.model ASC`;
        break;
      case 'model':
        orderByClause = `p.model ${currentSort.direction}, p.brand ASC`;
        break;
      case 'type':
        orderByClause = `p.type ${currentSort.direction}, p.brand ASC, p.model ASC`;
        break;
      case 'acquisition_date':
        orderByClause = `p.acquisition_date ${currentSort.direction}, p.brand ASC, p.model ASC`;
        break;
      case 'status':
        orderByClause = `
          p.is_deleted ${currentSort.direction}, 
          active_connections ${currentSort.direction === 'asc' ? 'DESC' : 'ASC'}, 
          p.brand ASC, 
          p.model ASC
        `;
        break;
      default:
        orderByClause = `p.brand ASC, p.model ASC`;
    }
    
    // Query all parts, including whether they're motherboards or parts with active connections
    const result = db.exec(`
      SELECT 
        p.id, 
        p.brand, 
        p.model, 
        p.type, 
        p.notes,
        p.is_deleted,
        p.acquisition_date,
        p.date_precision,
        CASE 
          WHEN p.type = 'motherboard' THEN (SELECT COUNT(*) FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL)
          ELSE (SELECT COUNT(*) FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL)
        END as active_connections,
        (SELECT ri.name FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as rig_name
      FROM parts p
      ${whereClause}
      ORDER BY ${orderByClause}
    `);
    
    // If there are parts, display them
    if (result.length > 0 && result[0].values.length > 0) {
      const rows = result[0].values;
      
      // Update results count
      document.getElementById('results-count').textContent = `${rows.length} parts found`;
      if (whereConditions.length > 0) {
        document.getElementById('results-count').textContent += ' (filtered)';
      }
      
      rows.forEach(row => {
        const tr = document.createElement('tr');
        
        // Get values from the query
        const id = row[0];
        const brand = row[1];
        const model = row[2];
        const type = row[3];
        const notes = row[4] || '';
        const isDeleted = row[5];
        const acquisitionDate = row[6];
        const datePrecision = row[7] || 'none';
        const activeConnections = row[8] || 0;
        const rigName = row[9] || '';
        
        // Add class for deleted items
        if (isDeleted) {
          tr.classList.add('deleted-part');
        }
        
        // ID column
        const idCell = document.createElement('td');
        idCell.textContent = id;
        tr.appendChild(idCell);
        
        // Brand column
        const brandCell = document.createElement('td');
        brandCell.textContent = brand;
        tr.appendChild(brandCell);
        
        // Model column
        const modelCell = document.createElement('td');
        modelCell.textContent = model;
        tr.appendChild(modelCell);
        
        // Type column
        const typeCell = document.createElement('td');
        typeCell.textContent = type;
        tr.appendChild(typeCell);
        
        // Acquisition date column
        const acquiredCell = document.createElement('td');
        if (acquisitionDate) {
          // Fix the timezone issue by using UTC date parts
          const [yearStr, monthStr, dayStr] = acquisitionDate.split('-');
          const year = parseInt(yearStr);
          const month = parseInt(monthStr) - 1; // JS months are 0-based
          const day = parseInt(dayStr);
          
          switch (datePrecision) {
            case 'day':
              acquiredCell.textContent = `${month+1}/${day}/${year}`;
              break;
            case 'month':
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                  'July', 'August', 'September', 'October', 'November', 'December'];
              acquiredCell.textContent = `${monthNames[month]} ${year}`;
              break;
            case 'year':
              acquiredCell.textContent = year.toString();
              break;
            default:
              acquiredCell.textContent = 'Unknown';
          }
        } else {
          acquiredCell.textContent = 'Unknown';
        }
        tr.appendChild(acquiredCell);
        
        // Status column
        const statusCell = document.createElement('td');
        if (isDeleted) {
          statusCell.textContent = 'Deleted';
          statusCell.style.color = '#f44336';
        } else if (type === 'motherboard' && activeConnections > 0) {
          statusCell.textContent = `Active Rig (${activeConnections} parts)`;
          statusCell.style.color = '#4CAF50';
          if (rigName) {
            statusCell.textContent += ` - "${rigName}"`;
          }
        } else if (activeConnections > 0) {
          statusCell.textContent = 'Connected';
          statusCell.style.color = '#2196F3';
        } else {
          statusCell.textContent = 'In Bin';
          statusCell.style.color = '#9e9e9e';
        }
        tr.appendChild(statusCell);
        
        // Notes column
        const notesCell = document.createElement('td');
        notesCell.textContent = notes;
        tr.appendChild(notesCell);
        
        // Actions column
        const actionsCell = document.createElement('td');
        
        // Create container for action buttons
        const actionButtonsContainer = document.createElement('div');
        actionButtonsContainer.className = 'action-buttons';
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'edit-btn';
        editBtn.addEventListener('click', () => editPart(id));
        actionButtonsContainer.appendChild(editBtn);
        
        // View Timeline button
        const timelineBtn = document.createElement('button');
        timelineBtn.textContent = 'Timeline';
        timelineBtn.className = 'view-timeline-btn';
        timelineBtn.classList.add('view-timeline');
        timelineBtn.setAttribute('data-id', id);
        actionButtonsContainer.appendChild(timelineBtn);
        
        // Connect button for parts that aren't motherboards and aren't deleted
        if (type !== 'motherboard' && !isDeleted) {
          const connectBtn = document.createElement('button');
          connectBtn.textContent = activeConnections > 0 ? 'Disconnect' : 'Connect';
          connectBtn.className = activeConnections > 0 ? 'disconnect-btn' : 'connect-btn';
          connectBtn.addEventListener('click', () => activeConnections > 0 ? showDisconnectOptions(id) : showConnectOptions(id));
          actionButtonsContainer.appendChild(connectBtn);
        }
        
        // Add button container to cell
        actionsCell.appendChild(actionButtonsContainer);
        
        // Rig Identity button for motherboards
        if (type === 'motherboard' && activeConnections > 0 && !isDeleted) {
          const rigBtn = document.createElement('button');
          rigBtn.textContent = rigName ? 'Rename Rig' : 'Name Rig';
          rigBtn.className = 'rig-btn';
          rigBtn.addEventListener('click', () => showRigIdentityForm(id, rigName));
          actionButtonsContainer.appendChild(rigBtn);
        }
        
        // Delete button (for disposal)
        if (!isDeleted) {
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Dispose';
          deleteBtn.className = 'delete-btn';
          deleteBtn.addEventListener('click', () => deletePart(id));
          actionButtonsContainer.appendChild(deleteBtn);
        }
        
        // Admin Delete button - always available but visually distinct
        const adminDeleteBtn = document.createElement('button');
        adminDeleteBtn.textContent = 'Delete from History';
        adminDeleteBtn.className = 'admin-button'; // Will style this
        adminDeleteBtn.addEventListener('click', () => hardDeletePart(id));
        actionButtonsContainer.appendChild(adminDeleteBtn);
        
        tr.appendChild(actionsCell);
        tbody.appendChild(tr);
      });
    } else {
      // Display a message if no parts
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8; // Updated for new columns
      
      if (whereConditions.length > 0) {
        td.textContent = 'No parts match the current filters.';
        document.getElementById('results-count').textContent = '0 parts found (filtered)';
      } else {
        td.textContent = 'No parts in database. Add your first part using the form.';
        document.getElementById('results-count').textContent = '0 parts found';
      }
      
      td.style.textAlign = 'center';
      td.style.padding = '20px 0';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('Error refreshing parts list:', err);
  }
}

// Update the file info in the UI
function updateFileInfo(filename) {
  document.getElementById('current-file').textContent = filename;
  document.getElementById('file-info').classList.remove('hidden');
}

// Show the app UI
function showAppUI() {
  document.getElementById('app-container').classList.remove('hidden');
}

// Update filter type options based on available part types in the database
function updateFilterTypeOptions() {
  if (!db) return;
  
  try {
    // Get all part types from the database
    const result = db.exec('SELECT DISTINCT type FROM parts ORDER BY type ASC');
    
    if (result.length > 0 && result[0].values.length > 0) {
      const types = result[0].values.map(row => row[0]);
      const filterTypeSelect = document.getElementById('filter-type');
      
      // Keep the "All Types" option
      const allTypesOption = filterTypeSelect.querySelector('option[value="all"]');
      
      // Clear existing options except "All Types"
      filterTypeSelect.innerHTML = '';
      filterTypeSelect.appendChild(allTypesOption);
      
      // Add each type as an option
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize first letter
        filterTypeSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Error updating filter type options:', err);
  }
}

// Format a date string based on precision
function formatDate(dateStr, precision) {
  if (!dateStr) return 'Unknown';
  
  try {
    // Parse the date parts directly to avoid timezone issues
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // JS months are 0-based
    const day = parseInt(dayStr);
    
    switch (precision) {
      case 'day':
        return `${month+1}/${day}/${year}`;
      case 'month':
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[month]} ${year}`;
      case 'year':
        return year.toString();
      default:
        return 'Unknown format';
    }
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Error';
  }
}

// Update the active filters display
function updateActiveFiltersDisplay() {
  const display = document.getElementById('active-filters-display');
  const { type, status, search } = currentFilters;
  const activeFilters = [];
  
  // Check each filter
  if (type !== 'all') {
    activeFilters.push(`<strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}`);
  }
  
  if (status !== 'all') {
    let statusText = status.charAt(0).toUpperCase() + status.slice(1);
    activeFilters.push(`<strong>Status:</strong> ${statusText}`);
  }
  
  if (search && search.trim() !== '') {
    activeFilters.push(`<strong>Search:</strong> "${search}"`);
  }
  
  // Show sort information
  let sortText = `<strong>Sort:</strong> ${currentSort.column} (${currentSort.direction === 'asc' ? '↑' : '↓'})`;
  activeFilters.push(sortText);
  
  // Update the display
  if (activeFilters.length > 0) {
    display.innerHTML = activeFilters.join(' &nbsp;|&nbsp; ');
    display.classList.add('has-filters');
  } else {
    display.textContent = 'Default sorting, no active filters';
    display.classList.remove('has-filters');
  }
}

// Refresh the parts bin view
function refreshPartsBin() {
  if (!db) return;
  
  const container = document.getElementById('parts-bin-container');
  container.innerHTML = '';
  
  try {
    // Get filter value
    const typeFilter = document.getElementById('part-bin-filter-type').value;
    
    // Query for all parts that aren't connected to anything and aren't deleted
    let query = `
      SELECT 
        p.id, 
        p.brand, 
        p.model, 
        p.type, 
        p.notes,
        p.acquisition_date,
        p.date_precision,
        (SELECT COUNT(*) FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL) as is_connected
      FROM parts p
      WHERE p.is_deleted = 0
        AND NOT EXISTS (SELECT 1 FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL)
    `;
    
    // Add type filter if selected
    if (typeFilter !== 'all') {
      query += ` AND p.type = '${typeFilter}'`;
    }
    
    // Add ordering
    query += `
      ORDER BY 
        p.type ASC,
        p.brand ASC,
        p.model ASC
    `;
    
    const result = db.exec(query);
    
    // If there are parts in the bin, display them
    if (result.length > 0 && result[0].values.length > 0) {
      const parts = result[0].values;
      
      parts.forEach(part => {
        const id = part[0];
        const brand = part[1];
        const model = part[2];
        const type = part[3];
        const notes = part[4] || '';
        const acquisitionDate = part[5];
        const datePrecision = part[6] || 'none';
        
        // Create part card
        const card = document.createElement('div');
        card.className = 'part-card';
        
        // Format acquisition date if available
        let acquiredText = 'Acquired: ';
        if (acquisitionDate) {
          // Fix the timezone issue by using the date parts directly
          const [yearStr, monthStr, dayStr] = acquisitionDate.split('-');
          const year = parseInt(yearStr);
          const month = parseInt(monthStr) - 1; // JS months are 0-based
          const day = parseInt(dayStr);
          
          switch (datePrecision) {
            case 'day':
              acquiredText += `${month+1}/${day}/${year}`;
              break;
            case 'month':
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                  'July', 'August', 'September', 'October', 'November', 'December'];
              acquiredText += `${monthNames[month]} ${year}`;
              break;
            case 'year':
              acquiredText += year.toString();
              break;
            default:
              acquiredText += 'Unknown';
          }
        } else {
          acquiredText += 'Unknown';
        }
        
        // Create button HTML - only show connect button for non-motherboard parts
        const connectButton = type !== 'motherboard' 
          ? `<button class="connect-btn" data-id="${id}">Connect</button>` 
          : '';
          
        card.innerHTML = `
          <div class="part-card-header">${type}: ${brand} ${model}</div>
          <div>${acquiredText}</div>
          ${notes ? `<div class="part-card-notes"><strong>Notes:</strong> ${notes}</div>` : ''}
          <div class="part-card-actions">
            ${connectButton}
            <button class="view-timeline-btn" data-id="${id}">Timeline</button>
            <button class="edit-btn" data-id="${id}">Edit</button>
          </div>
        `;
        
        // Add event listeners - only add connect listener if button exists
        if (type !== 'motherboard') {
          card.querySelector('.connect-btn').addEventListener('click', () => showConnectOptions(id));
        }
        card.querySelector('.view-timeline-btn').addEventListener('click', () => showPartTimeline(id));
        card.querySelector('.edit-btn').addEventListener('click', () => editPart(id));
        
        container.appendChild(card);
      });
    } else {
      // No parts in bin
      container.innerHTML = '<div class="empty-message">No parts in the bin that match the filter criteria.</div>';
    }
  } catch (err) {
    console.error('Error refreshing parts bin:', err);
    container.innerHTML = '<div class="error-message">Error loading parts bin. Please try again.</div>';
  }
}

// Refresh the rigs view
function refreshRigs() {
  if (!db) return;
  
  const activeContainer = document.getElementById('rigs-container');
  const historicalContainer = document.getElementById('historical-rigs-container');
  
  activeContainer.innerHTML = '';
  historicalContainer.innerHTML = '';
  
  try {
    // Query for active rigs (motherboards with connections)
    const activeRigsQuery = `
      SELECT 
        p.id,
        p.brand,
        p.model,
        (SELECT COUNT(*) FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL) as connected_parts,
        (SELECT name FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as rig_name,
        (SELECT active_from FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from,
        (SELECT active_from_precision FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as active_from_precision
      FROM parts p
      WHERE p.type = 'motherboard' AND p.is_deleted = 0
        AND EXISTS (SELECT 1 FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL)
      ORDER BY rig_name, p.brand, p.model
    `;
    
    const activeRigsResult = db.exec(activeRigsQuery);
    
    // If there are active rigs, display them
    if (activeRigsResult.length > 0 && activeRigsResult[0].values.length > 0) {
      const rigs = activeRigsResult[0].values;
      
      rigs.forEach(rig => {
        const id = rig[0];
        const brand = rig[1];
        const model = rig[2];
        const partCount = rig[3] || 0;
        const rigName = rig[4] || `${brand} ${model} Rig`;
        const activeFrom = rig[5];
        const activePrecision = rig[6] || 'day';
        
        // Create rig card
        const card = document.createElement('div');
        card.className = 'rig-card';
        
        // Format active from date if available
        let activeFromText = 'Active since: ';
        if (activeFrom) {
          const date = new Date(activeFrom);
          switch (activePrecision) {
            case 'day':
              activeFromText += date.toLocaleDateString();
              break;
            case 'month':
              activeFromText += date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
              break;
            case 'year':
              activeFromText += date.getFullYear().toString();
              break;
            default:
              activeFromText += 'Unknown';
          }
        } else {
          activeFromText += 'Unknown';
        }
        
        // Create header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'rig-card-header';
        
        const title = document.createElement('h3');
        title.className = 'rig-card-title';
        title.textContent = rigName;
        
        const rename = document.createElement('button');
        rename.textContent = 'Rename';
        rename.addEventListener('click', () => showRigIdentityForm(id, rigName));
        
        cardHeader.appendChild(title);
        cardHeader.appendChild(rename);
        
        // Create content
        const cardContent = document.createElement('div');
        cardContent.className = 'rig-card-content';
        
        cardContent.innerHTML = `
          <div>Motherboard: ${brand} ${model}</div>
          <div>${activeFromText}</div>
          <div>Connected Parts: ${partCount}</div>
          <div class="rig-parts-list"><strong>Parts:</strong></div>
        `;
        
        // Add the card to the container
        card.appendChild(cardHeader);
        card.appendChild(cardContent);
        
        // Query for parts connected to this motherboard
        const connectedPartsQuery = `
          SELECT 
            p.id,
            p.brand,
            p.model,
            p.type,
            c.id as connection_id,
            c.connected_at,
            c.connected_precision
          FROM connections c
          JOIN parts p ON c.part_id = p.id
          WHERE c.motherboard_id = ${id} AND c.disconnected_at IS NULL
          ORDER BY p.type, p.brand, p.model
        `;
        
        const connectedPartsResult = db.exec(connectedPartsQuery);
        
        // Add connected parts to the rig card
        const partsList = document.createElement('ul');
        partsList.className = 'rig-parts-list-items';
        
        if (connectedPartsResult.length > 0 && connectedPartsResult[0].values.length > 0) {
          connectedPartsResult[0].values.forEach(part => {
            const partId = part[0];
            const partBrand = part[1];
            const partModel = part[2];
            const partType = part[3];
            const connectionId = part[4];
            const connectedAt = part[5];
            const connectedPrecision = part[6] || 'day';
            
            // Format connected date
            let connectedText = ' (connected ';
            if (connectedAt) {
              const date = new Date(connectedAt);
              switch (connectedPrecision) {
                case 'day':
                  connectedText += date.toLocaleDateString();
                  break;
                case 'month':
                  connectedText += date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
                  break;
                case 'year':
                  connectedText += date.getFullYear().toString();
                  break;
                default:
                  connectedText += 'Unknown';
              }
            } else {
              connectedText += 'Unknown';
            }
            connectedText += ')';
            
            const li = document.createElement('li');
            li.className = 'rig-part-item';
            
            // Part info span
            const partInfo = document.createElement('span');
            partInfo.className = 'part-info';
            partInfo.textContent = `${partType}: ${partBrand} ${partModel}${connectedText}`;
            li.appendChild(partInfo);
            
            // Action buttons
            const actions = document.createElement('div');
            actions.className = 'part-actions';
            
            // Timeline button
            const timelineBtn = document.createElement('button');
            timelineBtn.textContent = 'Timeline';
            timelineBtn.style.backgroundColor = '#009688';
            timelineBtn.style.marginRight = '5px';
            timelineBtn.className = 'view-timeline-btn small-btn';
            timelineBtn.addEventListener('click', () => showPartTimeline(partId));
            actions.appendChild(timelineBtn);
            
            // Disconnect button
            const disconnectBtn = document.createElement('button');
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.style.backgroundColor = '#FF9800';
            disconnectBtn.style.marginRight = '5px';
            disconnectBtn.className = 'disconnect-btn small-btn';
            disconnectBtn.addEventListener('click', () => showDisconnectOptions(partId));
            actions.appendChild(disconnectBtn);
            
            li.appendChild(actions);
            partsList.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = 'No parts connected.';
          partsList.appendChild(li);
        }
        
        cardContent.querySelector('.rig-parts-list').appendChild(partsList);
        activeContainer.appendChild(card);
      });
    } else {
      // No active rigs
      activeContainer.innerHTML = '<div class="empty-message">No active rigs. Connect parts to a motherboard to create a rig.</div>';
    }
    
    // Only show true historical rigs - motherboards that had connections but now have none
    // and exclude those that are currently active
    const historicalRigsQuery = `
      WITH historical_motherboards AS (
        SELECT 
          c.motherboard_id,
          MAX(c.disconnected_at) as last_disconnection_date,
          MAX(c.disconnected_precision) as last_disconnection_precision
        FROM connections c
        GROUP BY c.motherboard_id
        HAVING COUNT(CASE WHEN c.disconnected_at IS NULL THEN 1 END) = 0
          AND COUNT(*) > 0
      ),
      active_motherboards AS (
        SELECT DISTINCT motherboard_id
        FROM connections
        WHERE disconnected_at IS NULL
      ),
      last_rig_for_mobo AS (
        SELECT 
          ri.motherboard_id,
          ri.name,
          ri.notes,
          ri.active_from,
          ri.active_from_precision
        FROM rig_identities ri
        JOIN (
          SELECT motherboard_id, MAX(active_from) as last_active
          FROM rig_identities
          GROUP BY motherboard_id
        ) latest ON ri.motherboard_id = latest.motherboard_id AND ri.active_from = latest.last_active
      )
      SELECT 
        hm.motherboard_id,
        p.brand,
        p.model,
        lrm.name,
        lrm.active_from,
        lrm.active_from_precision,
        hm.last_disconnection_date as active_until,
        hm.last_disconnection_precision as active_until_precision,
        lrm.notes
      FROM historical_motherboards hm
      JOIN parts p ON hm.motherboard_id = p.id
      LEFT JOIN last_rig_for_mobo lrm ON hm.motherboard_id = lrm.motherboard_id
      WHERE p.is_deleted = 0
        AND hm.motherboard_id NOT IN (SELECT motherboard_id FROM active_motherboards)
      ORDER BY hm.last_disconnection_date DESC
    `;
    
    const historicalRigsResult = db.exec(historicalRigsQuery);
    
    // If there are historical rigs, display them
    if (historicalRigsResult.length > 0 && historicalRigsResult[0].values.length > 0) {
      const rigs = historicalRigsResult[0].values;
      
      rigs.forEach(rig => {
        const motherboardId = rig[0];
        const brand = rig[1];
        const model = rig[2];
        const rigName = rig[3];
        const activeFrom = rig[4];
        const activeFromPrecision = rig[5] || 'day';
        const activeUntil = rig[6];
        const activeUntilPrecision = rig[7] || 'day';
        const notes = rig[8] || '';
        
        // Create historical rig card
        const card = document.createElement('div');
        card.className = 'rig-card historical';
        
        // Format active period
        let activeText = 'Active: ';
        
        // Format 'from' date
        if (activeFrom) {
          const fromDate = new Date(activeFrom);
          switch (activeFromPrecision) {
            case 'day':
              activeText += fromDate.toLocaleDateString();
              break;
            case 'month':
              activeText += fromDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
              break;
            case 'year':
              activeText += fromDate.getFullYear().toString();
              break;
            default:
              activeText += 'Unknown';
          }
        } else {
          activeText += 'Unknown';
        }
        
        activeText += ' to ';
        
        // Format 'until' date
        if (activeUntil) {
          const untilDate = new Date(activeUntil);
          switch (activeUntilPrecision) {
            case 'day':
              activeText += untilDate.toLocaleDateString();
              break;
            case 'month':
              activeText += untilDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
              break;
            case 'year':
              activeText += untilDate.getFullYear().toString();
              break;
            default:
              activeText += 'Unknown';
          }
        } else {
          activeText += 'Unknown';
        }
        
        card.innerHTML = `
          <div class="rig-card-header">
            <h3 class="rig-card-title">${rigName}</h3>
          </div>
          <div class="rig-card-content">
            <div>Motherboard: ${brand} ${model}</div>
            <div>${activeText}</div>
            ${notes ? `<div><strong>Notes:</strong> ${notes}</div>` : ''}
          </div>
        `;
        
        historicalContainer.appendChild(card);
      });
    } else {
      // No historical rigs
      historicalContainer.innerHTML = '<div class="empty-message">No historical rigs.</div>';
    }
  } catch (err) {
    console.error('Error refreshing rigs:', err);
    activeContainer.innerHTML = '<div class="error-message">Error loading active rigs. Please try again.</div>';
    historicalContainer.innerHTML = '<div class="error-message">Error loading historical rigs. Please try again.</div>';
  }
}

// Update the save status indicator
function updateSaveStatus() {
  const status = document.getElementById('save-status');
  
  if (hasUnsavedChanges) {
    status.textContent = 'Unsaved Changes';
    status.classList.remove('saved');
    status.classList.add('unsaved');
  } else {
    status.textContent = 'Saved';
    status.classList.remove('unsaved');
    status.classList.add('saved');
  }
}

// Note: restorePart function has been removed
// Instead, we now use the timeline event deletion on the disposal event
// to restore parts that were marked as deleted

// Show part timeline
async function showPartTimeline(partId) {
  if (!db) return;
  
  try {
    console.log('Showing timeline for part ID:', partId);
    
    // Get the part details
    // Using direct query construction since this is a single parameter
    const partResult = db.exec(`
      SELECT brand, model, type, acquisition_date, date_precision, is_deleted,
      (SELECT COUNT(*) FROM connections c WHERE c.part_id = ${partId} AND c.disconnected_at IS NULL) as is_connected
      FROM parts
      WHERE id = ${partId}
    `);
    
    console.log('Part query result:', partResult);
    
    if (!partResult.length || !partResult[0].values.length) {
      throw new Error('Part not found');
    }
    
    const partData = partResult[0].values[0];
    const partName = `${partData[0]} ${partData[1]} (${partData[2]})`;
    const partType = partData[2];
    const isDeleted = partData[5] === 1;
    const isConnected = partData[6] > 0;
    
    console.log('Part name for timeline:', partName);
    
    // Update the timeline title
    document.getElementById('timeline-part-name').textContent = partName;
    
    // Remove any existing action buttons
    const existingActions = document.querySelector('#part-timeline-view .actions');
    if (existingActions) {
      existingActions.remove();
    }
    
    // Clear the timeline
    const timelineContainer = document.getElementById('part-timeline');
    timelineContainer.innerHTML = '';
    
    // Create timeline array to hold all events
    const timelineEvents = [];
    
    // Add acquisition event if there's a date
    if (partData[3]) {
      timelineEvents.push({
        date: partData[3],
        precision: partData[4] || 'none',
        type: 'acquisition',
        title: 'Part Acquired',
        content: `The ${partData[0]} ${partData[1]} was acquired.`,
        notes: ''
      });
    }
    
    // Get all connections (part to motherboard)
    // Using direct query construction for consistent behavior
    const connectionsResult = db.exec(`
      SELECT 
        c.connected_at, 
        c.connected_precision,
        c.disconnected_at, 
        c.disconnected_precision,
        c.notes,
        p.brand, 
        p.model,
        ri.name
      FROM connections c
      JOIN parts p ON c.motherboard_id = p.id
      LEFT JOIN rig_identities ri ON ri.motherboard_id = p.id AND 
        (ri.active_from <= c.connected_at AND (ri.active_until IS NULL OR ri.active_until >= c.connected_at))
      WHERE c.part_id = ${partId}
      ORDER BY c.connected_at ASC
    `);
    
    console.log('Connections query result:', connectionsResult);
    
    // Add connection events
    if (connectionsResult.length && connectionsResult[0].values.length) {
      connectionsResult[0].values.forEach(conn => {
        const connectedAt = conn[0];
        const connectedPrecision = conn[1] || 'day';
        const disconnectedAt = conn[2];
        const disconnectedPrecision = conn[3] || 'day';
        const notes = conn[4] || '';
        const motherboardBrand = conn[5];
        const motherboardModel = conn[6];
        const rigName = conn[7] || '';
        
        // Add connected event
        const rigText = rigName ? ` (Part of "${rigName}" rig)` : '';
        timelineEvents.push({
          date: connectedAt,
          precision: connectedPrecision,
          type: 'connected',
          title: 'Connected to Motherboard',
          content: `Connected to ${motherboardBrand} ${motherboardModel}${rigText}`,
          notes: notes
        });
        
        // Add disconnected event if applicable
        if (disconnectedAt) {
          timelineEvents.push({
            date: disconnectedAt,
            precision: disconnectedPrecision,
            type: 'disconnected',
            title: 'Disconnected from Motherboard',
            content: `Disconnected from ${motherboardBrand} ${motherboardModel}${rigText}`,
            notes: notes
          });
        }
      });
    }
    
    // Get disposal event if applicable
    // Using direct query construction for consistent behavior
    const disposalResult = db.exec(`
      SELECT disposed_at, disposed_precision, reason, notes
      FROM disposals
      WHERE part_id = ${partId}
      ORDER BY disposed_at DESC
      LIMIT 1
    `);
    
    console.log('Disposal query result:', disposalResult);
    
    // Add disposal event if found
    if (disposalResult.length && disposalResult[0].values.length) {
      const disposal = disposalResult[0].values[0];
      timelineEvents.push({
        date: disposal[0],
        precision: disposal[1] || 'day',
        type: 'disposed',
        title: 'Part Disposed',
        content: `The part was disposed: ${disposal[2]}`,
        notes: disposal[3] || ''
      });
    }
    
    // Sort by date (using lexicographical sorting since our dates are ISO format)
    timelineEvents.sort((a, b) => {
      // If no dates, put at beginning
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date.localeCompare(b.date);
    });
    
    // Render timeline
    if (timelineEvents.length === 0) {
      // Display a message if no events
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-timeline';
      emptyMessage.textContent = 'No events found for this part. Try adding an acquisition date, connecting it to a motherboard, or recording its disposal.';
      timelineContainer.appendChild(emptyMessage);
    } else {
      // Render timeline events
      timelineEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = `timeline-item ${event.type}`;
        
        const dateElement = document.createElement('div');
        dateElement.className = 'timeline-date';
        
        // Format the date based on precision
        if (event.date) {
          const date = new Date(event.date);
          switch (event.precision) {
            case 'day':
              dateElement.textContent = date.toLocaleDateString();
              break;
            case 'month':
              dateElement.textContent = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
              break;
            case 'year':
              dateElement.textContent = date.getFullYear().toString();
              break;
            default:
              dateElement.textContent = 'Unknown Date';
          }
        } else {
          dateElement.textContent = 'Unknown Date';
        }
        
        const content = document.createElement('div');
        content.className = 'timeline-content';
        
        const title = document.createElement('h3');
        title.textContent = event.title;
        
        const description = document.createElement('p');
        description.textContent = event.content;
        
        content.appendChild(title);
        content.appendChild(description);
        
        if (event.notes) {
          const notes = document.createElement('p');
          notes.innerHTML = `<strong>Notes:</strong> ${event.notes}`;
          content.appendChild(notes);
        }
        
        // Add admin action to delete this event
        const adminActions = document.createElement('div');
        adminActions.className = 'timeline-admin-actions';
        
        // Only add delete event button for connected, disconnected, and disposed events (not for acquisition)
        if (event.type !== 'acquisition') {
          const deleteEventBtn = document.createElement('button');
          deleteEventBtn.textContent = 'Delete Event';
          deleteEventBtn.className = 'admin-button small-btn';
          deleteEventBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this event from history? This cannot be undone.')) {
              try {
                // Different handling based on event type
                switch(event.type) {
                  case 'connected':
                    // Delete specific connection by finding the matching record
                    // We identify it by matching all the fields
                    db.run(`
                      DELETE FROM connections 
                      WHERE part_id = ${partId} 
                      AND connected_at = '${event.date}'
                      AND disconnected_at IS NULL
                    `);
                    break;
                    
                  case 'disconnected':
                    // Find the connection and clear its disconnected date
                    db.run(`
                      UPDATE connections 
                      SET disconnected_at = NULL, disconnected_precision = NULL
                      WHERE part_id = ${partId} 
                      AND disconnected_at = '${event.date}'
                    `);
                    break;
                    
                  case 'disposed':
                    // Delete disposal record and un-delete the part
                    db.run(`DELETE FROM disposals WHERE part_id = ${partId} AND disposed_at = '${event.date}'`);
                    db.run(`UPDATE parts SET is_deleted = 0 WHERE id = ${partId}`);
                    break;
                    
                  default:
                    alert('Unknown event type');
                    return;
                }
                
                // Save changes
                hasUnsavedChanges = true;
                updateSaveStatus();
                await saveToFile();
                
                // Refresh the timeline
                showPartTimeline(partId);
                
                // Also refresh the part list
                refreshPartsList();
                refreshPartsBin();
                refreshRigs();
                
              } catch (err) {
                console.error('Error deleting event:', err);
                alert('Error deleting event: ' + err.message);
              }
            }
          });
          
          adminActions.appendChild(deleteEventBtn);
        }
        
        content.appendChild(adminActions);
        
        item.appendChild(dateElement);
        item.appendChild(content);
        timelineContainer.appendChild(item);
      });
    }
    
    // Add part action buttons to the timeline view
    const partActionsContainer = document.createElement('div');
    partActionsContainer.className = 'actions';
    
    // Only add connect/disconnect and dispose buttons if not a motherboard and not deleted
    if (partType !== 'motherboard' && !isDeleted) {
      // Connect/Disconnect button
      const connectBtn = document.createElement('button');
      connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect';
      connectBtn.className = isConnected ? 'disconnect-btn' : 'connect-btn';
      connectBtn.addEventListener('click', () => isConnected ? showDisconnectOptions(partId) : showConnectOptions(partId));
      partActionsContainer.appendChild(connectBtn);
      
      // Dispose button
      const disposeBtn = document.createElement('button');
      disposeBtn.textContent = 'Dispose';
      disposeBtn.className = 'delete-btn';
      disposeBtn.addEventListener('click', () => deletePart(partId));
      partActionsContainer.appendChild(disposeBtn);
    }
    
    // Admin Delete button - always available
    const adminDeleteBtn = document.createElement('button');
    adminDeleteBtn.textContent = 'Delete from History';
    adminDeleteBtn.className = 'admin-button';
    adminDeleteBtn.addEventListener('click', () => hardDeletePart(partId));
    partActionsContainer.appendChild(adminDeleteBtn);
    
    // Insert the action buttons after the back button and before the timeline
    const backButton = document.getElementById('back-to-parts');
    backButton.parentNode.insertBefore(partActionsContainer, backButton.nextSibling);
    
    // Show the timeline view
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('part-timeline-view').classList.remove('hidden');
    
    console.log('Timeline view activated with', timelineEvents.length, 'events');
    
  } catch (err) {
    console.error('Error showing timeline:', err);
    alert('Error showing timeline: ' + err.message);
  }
}

// Handle date form submission
async function handleDateFormSubmit(event) {
  event.preventDefault();
  
  const action = document.getElementById('date-form-action').value;
  const id = document.getElementById('date-form-id').value;
  const notes = document.getElementById('date-notes').value;
  
  // Get date with proper precision
  const yearSelect = document.getElementById('date-year');
  const monthSelect = document.getElementById('date-month');
  const daySelect = document.getElementById('date-day');
  
  const year = yearSelect.value ? parseInt(yearSelect.value) : null;
  const month = monthSelect.value ? parseInt(monthSelect.value) : null;
  const day = daySelect.value ? parseInt(daySelect.value) : null;
  
  if (!year) {
    alert('Year is required');
    return;
  }
  
  // Determine date precision
  let datePrecision = 'year';
  if (month) {
    datePrecision = 'month';
    if (day) {
      datePrecision = 'day';
    }
  }
  
  // Format date for storage
  let formattedDate;
  if (month && day) {
    formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } else if (month) {
    formattedDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  } else {
    formattedDate = `${year}-01-01`;
  }
  
  try {
    switch (action) {
      case 'connect':
        await connectPart(id, formattedDate, datePrecision, notes);
        break;
      case 'disconnect':
        await disconnectPart(id, formattedDate, datePrecision, notes);
        break;
      case 'dispose':
        await disposePart(id, formattedDate, datePrecision, notes);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    // Close the modal
    document.getElementById('date-modal').style.display = 'none';
    
    // Reset the form
    document.getElementById('date-form').reset();
    
    // Refresh the parts list
    refreshPartsList();
    
  } catch (err) {
    console.error(`Error handling ${action}:`, err);
    alert(`Error: ${err.message}`);
  }
}

// Initialize date selects with a specific date
function initializeDateSelects(date, precision) {
  if (!date) return;
  
  try {
    console.log('Initializing date selects with', date, precision);
    
    // Parse the date
    const [yearStr, monthStr, dayStr] = date.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    
    // Set the values in the select elements
    const yearSelect = document.getElementById('date-year');
    const monthSelect = document.getElementById('date-month');
    const daySelect = document.getElementById('date-day');
    
    // Set year
    if (yearSelect) {
      for (let i = 0; i < yearSelect.options.length; i++) {
        if (parseInt(yearSelect.options[i].value) === year) {
          yearSelect.selectedIndex = i;
          break;
        }
      }
    }
    
    // Set month if precision is month or day
    if (precision === 'month' || precision === 'day') {
      if (monthSelect) {
        monthSelect.value = month;
      }
      
      // Update days in month
      if (precision === 'day' && monthSelect && daySelect) {
        updateDaysInMonth(monthSelect, daySelect);
        
        // Set day
        if (daySelect) {
          setTimeout(() => {
            daySelect.value = day;
          }, 10); // Small delay to ensure updateDaysInMonth has completed
        }
      }
    }
  } catch (err) {
    console.error('Error initializing date selects:', err);
  }
}

// Show date form modal for connecting a part with a specific date
function showDateModal(action, id, title, callback, initialDate, initialPrecision) {
  const modal = document.getElementById('date-modal');
  const titleElement = document.getElementById('date-modal-title');
  titleElement.textContent = title;
  
  // Set form values
  document.getElementById('date-form-action').value = action;
  document.getElementById('date-form-id').value = id;
  
  // Initialize date selects if a date was provided
  if (initialDate) {
    initializeDateSelects(initialDate, initialPrecision || 'day');
  }
  
  // Show modal
  modal.style.display = 'block';
  
  // Reset any previous onClick handlers
  const submitButton = document.getElementById('date-form-submit');
  submitButton.onclick = null;
  
  // Set callback if provided, otherwise let the form submit naturally
  if (callback) {
    submitButton.onclick = (e) => {
      e.preventDefault();
      callback();
    };
  }
  
  console.log(`Date modal shown for action: ${action}, id: ${id}`);
}

// Connect a part with a specific date
async function connectPart(partId, date, precision, notes, targetMotherboardId) {
  try {
    console.log('Connect part function called with partId:', partId, 'targetMotherboardId:', targetMotherboardId);
    
    // If no target motherboard ID was provided, show the motherboard selection dialog
    if (!targetMotherboardId) {
      console.log('No target motherboard provided, showing options');
      showConnectOptions(partId, date, precision, notes);
      return;
    }
    
    console.log('Disconnecting any existing connections for part', partId);
    // First disconnect any existing connections
    try {
      db.run(`
        UPDATE connections 
        SET disconnected_at = '${date}', disconnected_precision = '${precision}' 
        WHERE part_id = ${partId} AND disconnected_at IS NULL
      `);
    } catch (err) {
      console.error('Error disconnecting existing connections:', err);
    }
    
    console.log('Creating new connection between part', partId, 'and motherboard', targetMotherboardId);
    // Create new connection
    db.run(`
      INSERT INTO connections (part_id, motherboard_id, connected_at, connected_precision, notes)
      VALUES (${partId}, ${targetMotherboardId}, '${date}', '${precision}', '${notes || ''}')
    `);
    
    // Check if the motherboard already has an active rig identity
    const rigIdentityCheck = db.exec(`
      SELECT COUNT(*) FROM rig_identities 
      WHERE motherboard_id = ${targetMotherboardId} AND active_until IS NULL
    `);
    
    const hasRigIdentity = rigIdentityCheck[0]?.values[0][0] > 0;
    
    // If no active rig identity exists, create one
    if (!hasRigIdentity) {
      console.log('Creating initial rig identity for motherboard', targetMotherboardId);
      
      // Get motherboard info for default name
      const motherboardInfo = db.exec(`
        SELECT brand, model FROM parts WHERE id = ${targetMotherboardId}
      `)[0].values[0];
      
      const defaultRigName = `${motherboardInfo[0]} ${motherboardInfo[1]} Rig`;
      
      // Create initial rig identity with same date as connection
      db.run(`
        INSERT INTO rig_identities (motherboard_id, name, active_from, active_from_precision)
        VALUES (${targetMotherboardId}, '${defaultRigName}', '${date}', '${precision}')
      `);
      
      console.log('Created initial rig identity with name:', defaultRigName);
    }
    
    // Save and refresh
    hasUnsavedChanges = true;
    updateSaveStatus();
    await saveToFile();
    refreshPartsList();
    refreshPartsBin();
    refreshRigs();
    
  } catch (err) {
    console.error('Error connecting part:', err);
    throw new Error('Error connecting part: ' + err.message);
  }
}

// Disconnect a part with a specific date
async function disconnectPart(partId, date, precision, notes) {
  try {
    console.log('Disconnect part function called with partId:', partId);
    
    // Find all active connections for this part
    const connections = db.exec(
      `SELECT id FROM connections WHERE part_id = ${partId} AND disconnected_at IS NULL`
    );
    
    console.log('Active connections found:', connections);
    
    if (!connections.length || !connections[0].values.length) {
      throw new Error('No active connections found for this part');
    }
    
    // Disconnect all active connections
    connections[0].values.forEach(conn => {
      console.log('Disconnecting connection with ID:', conn[0]);
      
      try {
        db.run(`
          UPDATE connections 
          SET disconnected_at = '${date}', disconnected_precision = '${precision}', 
              notes = CASE WHEN notes IS NULL OR notes = '' THEN '${notes || ''}' ELSE notes || '\n' || '${notes || ''}' END
          WHERE id = ${conn[0]}
        `);
      } catch (disconnectErr) {
        console.error('Error disconnecting connection:', disconnectErr);
      }
    });
    
    // Save and refresh
    hasUnsavedChanges = true;
    updateSaveStatus();
    await saveToFile();
    refreshPartsList();
    refreshPartsBin();
    refreshRigs();
    
  } catch (err) {
    console.error('Error disconnecting part:', err);
    throw new Error('Error disconnecting part: ' + err.message);
  }
}

// Dispose a part with a specific date
async function disposePart(partId, date, precision, notes) {
  try {
    console.log('Dispose part function called with partId:', partId, 'date:', date);
    
    // Disconnect any active connections first
    const connections = db.exec(
      `SELECT id FROM connections WHERE part_id = ${partId} AND disconnected_at IS NULL`
    );
    
    console.log('Active connections found for disposal:', connections);
    
    if (connections.length && connections[0].values.length) {
      connections[0].values.forEach(conn => {
        console.log('Disconnecting connection with ID:', conn[0], 'due to disposal');
        try {
          db.run(`
            UPDATE connections 
            SET disconnected_at = '${date}', disconnected_precision = '${precision}', 
                notes = CASE WHEN notes IS NULL OR notes = '' THEN 'Disconnected due to disposal' 
                ELSE notes || '\n' || 'Disconnected due to disposal' END
            WHERE id = ${conn[0]}
          `);
        } catch (connErr) {
          console.error('Error disconnecting connection during disposal:', connErr);
        }
      });
    }
    
    console.log('Adding disposal record for part', partId);
    
    // Add disposal record
    db.run(`
      INSERT INTO disposals (part_id, disposed_at, disposed_precision, reason, notes)
      VALUES (${partId}, '${date}', '${precision}', 'Disposed', '${notes || ''}')
    `);
    
    // Mark part as deleted
    db.run(`UPDATE parts SET is_deleted = 1 WHERE id = ${partId}`);
    
    // Save and refresh
    hasUnsavedChanges = true;
    updateSaveStatus();
    await saveToFile();
    refreshPartsList();
    refreshPartsBin();
    refreshRigs();
    
    console.log('Part successfully disposed:', partId);
    
  } catch (err) {
    console.error('Error disposing part:', err);
    throw new Error('Error disposing part: ' + err.message);
  }
}

// Show connect options (which motherboard to connect to)
function showConnectOptions(partId, date, precision, notes) {
  try {
    console.log('Showing connect options for part ID:', partId);
    
    // Get part details including acquisition date
    const partResult = db.exec(`
      SELECT type, acquisition_date, date_precision 
      FROM parts 
      WHERE id = ${partId}
    `);
    
    if (partResult.length && partResult[0].values.length) {
      const partType = partResult[0].values[0][0];
      const partAcquisitionDate = partResult[0].values[0][1];
      const partDatePrecision = partResult[0].values[0][2];
      
      // First verify this is not a motherboard trying to be connected (safety check)
      if (partType === 'motherboard') {
        alert('Error: Cannot connect a motherboard to another motherboard.');
        return;
      }
      
      // If no date was provided, use the part's acquisition date as default (if available)
      if (!date && partAcquisitionDate) {
        date = partAcquisitionDate;
        precision = partDatePrecision || 'day';
      }
    }
    
    // Get all available motherboards that aren't deleted
    const motherboards = db.exec(`
      SELECT id, brand, model, 
        (SELECT COUNT(*) FROM connections WHERE motherboard_id = parts.id AND disconnected_at IS NULL) as connected_parts,
        (SELECT name FROM rig_identities WHERE motherboard_id = parts.id AND active_until IS NULL ORDER BY active_from DESC LIMIT 1) as rig_name,
        acquisition_date,
        date_precision
      FROM parts 
      WHERE type = 'motherboard' AND is_deleted = 0
      ORDER BY brand, model
    `);
    
    console.log('Available motherboards:', motherboards);
    
    if (!motherboards.length || !motherboards[0].values.length) {
      alert('No motherboards available to connect to. Add a motherboard first.');
      return;
    }
    
    // Create a dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Connect Part to Motherboard</h2>
        <div class="form-group">
          <label for="motherboard-select">Select Motherboard:</label>
          <select id="motherboard-select"></select>
        </div>
        <div class="form-group">
          <label for="connection-date">Connection Date:</label>
          <p id="date-message">Set the date when this connection was made. If not specified, current date is used.</p>
          <button id="select-connection-date" class="secondary-button">Select Date</button>
        </div>
        <div class="form-group">
          <label for="connection-notes">Notes:</label>
          <textarea id="connection-notes" rows="3"></textarea>
        </div>
        <button id="confirm-connect">Connect</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Set notes text if provided
    if (notes) {
      dialog.querySelector('#connection-notes').value = notes;
    }
    
    // Update date message if we have an acquisition date
    if (date) {
      const dateMessage = dialog.querySelector('#date-message');
      dateMessage.innerHTML = `Set the date when this connection was made. <strong>Using part's acquisition date: ${formatDate(date, precision)}</strong>`;
    }
    
    // Add motherboards to select
    const select = dialog.querySelector('#motherboard-select');
    motherboards[0].values.forEach(mb => {
      const option = document.createElement('option');
      option.value = mb[0];
      let label = `${mb[1]} ${mb[2]}`;
      
      // Add acquisition date if available
      if (mb[5]) {
        const acquisitionDate = mb[5];
        const datePrecision = mb[6] || 'none';
        
        let dateText = ' (Acquired: ';
        if (acquisitionDate) {
          // Fix the timezone issue by using UTC date parts
          const [yearStr, monthStr, dayStr] = acquisitionDate.split('-');
          const year = parseInt(yearStr);
          const month = parseInt(monthStr) - 1; // JS months are 0-based
          const day = parseInt(dayStr);
          
          switch (datePrecision) {
            case 'day':
              dateText += `${month+1}/${day}/${year}`;
              break;
            case 'month':
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                  'July', 'August', 'September', 'October', 'November', 'December'];
              dateText += `${monthNames[month]} ${year}`;
              break;
            case 'year':
              dateText += year.toString();
              break;
            default:
              dateText += 'Unknown';
          }
        } else {
          dateText += 'Unknown';
        }
        dateText += ')';
        label += dateText;
      }
      
      // Add connected parts and rig name
      if (mb[3] > 0) {
        label += ` (${mb[3]} connected parts)`;
      }
      if (mb[4]) {
        label += ` - "${mb[4]}"`;
      }
      
      option.textContent = label;
      select.appendChild(option);
    });
    
    // Select date button
    dialog.querySelector('#select-connection-date').addEventListener('click', () => {
      // Hide the connect dialog temporarily
      dialog.style.display = 'none';
      
      // Show the date modal with the part's acquisition date or previously set date
      const initialDate = date || null;
      const initialPrecision = precision || 'day';
      
      // Before showing the modal, pre-fill form with the part's acquisition date
      if (initialDate) {
        // Get the date form elements
        const dateForm = document.getElementById('date-form');
        dateForm.reset(); // Clear any previous values
        
        // Parse the date
        const [yearStr, monthStr, dayStr] = initialDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const day = parseInt(dayStr);
        
        // Get the select elements
        const yearSelect = document.getElementById('date-year');
        const monthSelect = document.getElementById('date-month');
        const daySelect = document.getElementById('date-day');
        
        // Set year
        for (let i = 0; i < yearSelect.options.length; i++) {
          if (parseInt(yearSelect.options[i].value) === year) {
            yearSelect.selectedIndex = i;
            break;
          }
        }
        
        // Set month if precision is month or day
        if (initialPrecision === 'month' || initialPrecision === 'day') {
          monthSelect.value = month;
          
          // Update days in month and set day if precision is day
          if (initialPrecision === 'day') {
            updateDaysInMonth(monthSelect, daySelect);
            setTimeout(() => {
              daySelect.value = day;
            }, 10);
          }
        }
      }
      
      showDateModal('temp-connect', partId, 'Select Connection Date', async () => {
        // Callback function when date is selected
        // Get date form values
        const yearSelect = document.getElementById('date-year');
        const monthSelect = document.getElementById('date-month');
        const daySelect = document.getElementById('date-day');
        const dateNotes = document.getElementById('date-notes').value;
        
        const year = yearSelect.value ? parseInt(yearSelect.value) : null;
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        
        if (!year) {
          alert('Year is required');
          return;
        }
        
        // Determine date precision
        let datePrecision = 'year';
        if (month) {
          datePrecision = 'month';
          if (day) {
            datePrecision = 'day';
          }
        }
        
        // Format date for storage
        let formattedDate;
        if (month && day) {
          formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else if (month) {
          formattedDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        } else {
          formattedDate = `${year}-01-01`;
        }
        
        // Update the connection notes with date notes if any
        if (dateNotes) {
          dialog.querySelector('#connection-notes').value += '\n' + dateNotes;
        }
        
        // Hide date modal and show connect dialog again
        document.getElementById('date-modal').style.display = 'none';
        document.getElementById('date-form').reset();
        dialog.style.display = 'block';
        
        // Store the date and precision in data attributes for later use
        dialog.dataset.date = formattedDate;
        dialog.dataset.precision = datePrecision;
      });
    });
    
    // Close button
    dialog.querySelector('.close').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // Connect button
    dialog.querySelector('#confirm-connect').addEventListener('click', async () => {
      const motherboardId = select.value;
      const connectionNotes = dialog.querySelector('#connection-notes').value;
      
      // Use provided date, date from date picker, acquisition date, or current date (in that order of priority)
      const connectionDate = date || dialog.dataset.date || new Date().toISOString().split('T')[0];
      const datePrecision = precision || dialog.dataset.precision || 'day';
      
      console.log('Connecting part', partId, 'to motherboard', motherboardId, 'with date', connectionDate, 'precision', datePrecision);
      
      try {
        // Connect the part using our helper function
        await connectPart(partId, connectionDate, datePrecision, connectionNotes, motherboardId);
        
        // Close dialog
        document.body.removeChild(dialog);
        
      } catch (err) {
        console.error('Error connecting part:', err);
        alert('Error connecting part: ' + err.message);
      }
    });
    
    // Show dialog
    dialog.style.display = 'block';
    
  } catch (err) {
    console.error('Error showing connect options:', err);
    alert('Error: ' + err.message);
  }
}

// Show disconnect options
function showDisconnectOptions(partId) {
  try {
    console.log('Showing disconnect options for part ID:', partId);
    
    // Get current connections for this part
    const connections = db.exec(`
      SELECT 
        c.id, 
        p.brand, 
        p.model,
        c.connected_at,
        c.connected_precision,
        ri.name as rig_name
      FROM connections c
      JOIN parts p ON c.motherboard_id = p.id
      LEFT JOIN rig_identities ri ON ri.motherboard_id = p.id AND ri.active_until IS NULL
      WHERE c.part_id = ${partId} AND c.disconnected_at IS NULL
      ORDER BY c.connected_at DESC
    `);
    
    console.log('Active connections found for disconnect:', connections);
    
    if (!connections.length || !connections[0].values.length) {
      alert('No active connections found.');
      return;
    }
    
    // Create a dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Disconnect Part</h2>
        <p>This part is connected to:</p>
        <ul id="connection-list"></ul>
        <div class="form-group">
          <label for="disconnect-date">Disconnection Date:</label>
          <p>Set the date when this disconnection was made. If not specified, current date is used.</p>
          <button id="select-disconnect-date" class="secondary-button">Select Date</button>
        </div>
        <div class="form-group">
          <label for="disconnect-notes">Notes:</label>
          <textarea id="disconnect-notes" rows="3"></textarea>
        </div>
        <button id="confirm-disconnect">Disconnect</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add connections to list
    const list = dialog.querySelector('#connection-list');
    const connectionIds = [];
    
    connections[0].values.forEach(conn => {
      const li = document.createElement('li');
      let text = `${conn[1]} ${conn[2]}`;
      if (conn[5]) {
        text += ` (Rig: "${conn[5]}")`;
      }
      
      // Format connected date based on precision
      const connectedDate = conn[3];
      const connectedPrecision = conn[4] || 'day';
      let dateText = ' - Connected ';
      
      if (connectedDate) {
        const date = new Date(connectedDate);
        switch (connectedPrecision) {
          case 'day':
            dateText += date.toLocaleDateString();
            break;
          case 'month':
            dateText += date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
            break;
          case 'year':
            dateText += date.getFullYear().toString();
            break;
          default:
            dateText += 'Unknown Date';
        }
      } else {
        dateText += 'Unknown Date';
      }
      
      text += dateText;
      li.textContent = text;
      list.appendChild(li);
      connectionIds.push(conn[0]);
    });
    
    // Select date button
    dialog.querySelector('#select-disconnect-date').addEventListener('click', () => {
      // Hide the disconnect dialog temporarily
      dialog.style.display = 'none';
      
      // Show the date modal
      showDateModal('temp-disconnect', partId, 'Select Disconnection Date', async () => {
        // Get date form values
        const yearSelect = document.getElementById('date-year');
        const monthSelect = document.getElementById('date-month');
        const daySelect = document.getElementById('date-day');
        const dateNotes = document.getElementById('date-notes').value;
        
        const year = yearSelect.value ? parseInt(yearSelect.value) : null;
        const month = monthSelect.value ? parseInt(monthSelect.value) : null;
        const day = daySelect.value ? parseInt(daySelect.value) : null;
        
        if (!year) {
          alert('Year is required');
          return;
        }
        
        // Determine date precision
        let datePrecision = 'year';
        if (month) {
          datePrecision = 'month';
          if (day) {
            datePrecision = 'day';
          }
        }
        
        // Format date for storage
        let formattedDate;
        if (month && day) {
          formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        } else if (month) {
          formattedDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        } else {
          formattedDate = `${year}-01-01`;
        }
        
        // Update the disconnection notes with date notes if any
        if (dateNotes) {
          dialog.querySelector('#disconnect-notes').value += '\n' + dateNotes;
        }
        
        // Hide date modal and show disconnect dialog again
        document.getElementById('date-modal').style.display = 'none';
        document.getElementById('date-form').reset();
        dialog.style.display = 'block';
        
        // Store the date and precision in data attributes for later use
        dialog.dataset.date = formattedDate;
        dialog.dataset.precision = datePrecision;
      });
    });
    
    // Close button
    dialog.querySelector('.close').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // Disconnect button
    dialog.querySelector('#confirm-disconnect').addEventListener('click', async () => {
      const notes = dialog.querySelector('#disconnect-notes').value;
      
      // Use provided date or current date
      const disconnectDate = dialog.dataset.date || new Date().toISOString().split('T')[0];
      const datePrecision = dialog.dataset.precision || 'day';
      
      console.log('Disconnecting part', partId, 'with date', disconnectDate);
      
      try {
        // Disconnect all active connections
        connectionIds.forEach(id => {
          console.log('Disconnecting connection with ID:', id);
          
          try {
            db.run(`
              UPDATE connections 
              SET disconnected_at = '${disconnectDate}', disconnected_precision = '${datePrecision}', 
                  notes = CASE WHEN notes IS NULL OR notes = '' THEN '${notes || ''}' ELSE notes || '\n' || '${notes || ''}' END
              WHERE id = ${id}
            `);
          } catch (updateErr) {
            console.error('Error updating connection:', updateErr);
          }
        });
        
        // Save and refresh
        hasUnsavedChanges = true;
        updateSaveStatus();
        await saveToFile();
        refreshPartsList();
        refreshPartsBin();
        refreshRigs();
        
        // Close dialog
        document.body.removeChild(dialog);
        
      } catch (err) {
        console.error('Error disconnecting part:', err);
        alert('Error disconnecting part: ' + err.message);
      }
    });
    
    // Show dialog
    dialog.style.display = 'block';
    
  } catch (err) {
    console.error('Error showing disconnect options:', err);
    alert('Error: ' + err.message);
  }
}

// Show rig identity form
function showRigIdentityForm(motherboardId, currentName) {
  // Create a dialog
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>${currentName ? 'Rename Rig' : 'Name Rig'}</h2>
      <div class="form-group">
        <label for="rig-name">Rig Name:</label>
        <input type="text" id="rig-name" value="${currentName || ''}" required>
      </div>
      <div class="form-group">
        <label for="rig-active-date">Active Since:</label>
        <p>Set the date when this rig became active. If not specified, current date is used.</p>
        <button id="select-rig-date" class="secondary-button">Select Date</button>
      </div>
      <div class="form-group">
        <label for="rig-notes">Notes:</label>
        <textarea id="rig-notes" rows="3"></textarea>
      </div>
      <button id="confirm-rig-name">Save</button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Select date button
  dialog.querySelector('#select-rig-date').addEventListener('click', () => {
    // Hide the rig dialog temporarily
    dialog.style.display = 'none';
    
    // Show the date modal
    showDateModal('temp-rig', motherboardId, 'Select Rig Active Date', async () => {
      // Get date form values
      const yearSelect = document.getElementById('date-year');
      const monthSelect = document.getElementById('date-month');
      const daySelect = document.getElementById('date-day');
      const dateNotes = document.getElementById('date-notes').value;
      
      const year = yearSelect.value ? parseInt(yearSelect.value) : null;
      const month = monthSelect.value ? parseInt(monthSelect.value) : null;
      const day = daySelect.value ? parseInt(daySelect.value) : null;
      
      if (!year) {
        alert('Year is required');
        return;
      }
      
      // Determine date precision
      let datePrecision = 'year';
      if (month) {
        datePrecision = 'month';
        if (day) {
          datePrecision = 'day';
        }
      }
      
      // Format date for storage
      let formattedDate;
      if (month && day) {
        formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      } else if (month) {
        formattedDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      } else {
        formattedDate = `${year}-01-01`;
      }
      
      // Update the rig notes with date notes if any
      if (dateNotes) {
        const notesElement = dialog.querySelector('#rig-notes');
        notesElement.value += (notesElement.value ? '\n' : '') + dateNotes;
      }
      
      // Hide date modal and show rig dialog again
      document.getElementById('date-modal').style.display = 'none';
      document.getElementById('date-form').reset();
      dialog.style.display = 'block';
      
      // Store the date and precision in data attributes for later use
      dialog.dataset.date = formattedDate;
      dialog.dataset.precision = datePrecision;
    });
  });
  
  // Close button
  dialog.querySelector('.close').addEventListener('click', () => {
    document.body.removeChild(dialog);
  });
  
  // Save button
  dialog.querySelector('#confirm-rig-name').addEventListener('click', async () => {
    const rigName = dialog.querySelector('#rig-name').value.trim();
    const notes = dialog.querySelector('#rig-notes').value;
    
    // Use provided date or current date
    const activeDate = dialog.dataset.date || new Date().toISOString().split('T')[0];
    const datePrecision = dialog.dataset.precision || 'day';
    
    if (!rigName) {
      alert('Please enter a rig name.');
      return;
    }
    
    try {
      if (currentName) {
        // Just update the name of the existing rig identity instead of ending it
        db.run(`
          UPDATE rig_identities
          SET name = ?, notes = CASE WHEN notes IS NULL OR notes = '' THEN ? ELSE notes || ? END
          WHERE motherboard_id = ? AND active_until IS NULL
        `, [
          rigName, 
          notes, 
          notes ? '\n' + notes : '', 
          motherboardId
        ]);
      } else {
        // Create new rig identity if there wasn't one before
        db.run(`
          INSERT INTO rig_identities (motherboard_id, name, notes, active_from, active_from_precision)
          VALUES (?, ?, ?, ?, ?)
        `, [motherboardId, rigName, notes, activeDate, datePrecision]);
      }
      
      // Save and refresh
      hasUnsavedChanges = true;
      updateSaveStatus();
      await saveToFile();
      refreshPartsList();
      refreshRigs();
      
      // Close dialog
      document.body.removeChild(dialog);
      
    } catch (err) {
      console.error('Error setting rig identity:', err);
      alert('Error setting rig identity: ' + err.message);
    }
  });
  
  // Show dialog
  dialog.style.display = 'block';
}

// Warn user about unsaved changes when leaving the page
window.addEventListener('beforeunload', (event) => {
  if (hasUnsavedChanges) {
    event.preventDefault();
    event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});