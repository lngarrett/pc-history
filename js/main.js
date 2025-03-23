/**
 * Main application module for PC History Tracker
 */

// Application namespace
window.App = (function() {
  // Private members
  let hasUnsavedChanges = false;
  
  // Public interface
  return {
    // Expose hasUnsavedChanges for controllers
    get hasUnsavedChanges() {
      return hasUnsavedChanges;
    },
    
    set hasUnsavedChanges(value) {
      hasUnsavedChanges = value;
    },
    
    // Initialize the application
    init: async function() {
      // Check if browser supports File System Access API
      const supportsFileSystemAccess = window.FileService.supportsFileSystemAccessAPI();
      if (!supportsFileSystemAccess) {
        document.getElementById('browser-warning').classList.remove('hidden');
      }
      
      // Set up event listeners for buttons
      document.getElementById('open-db').addEventListener('click', this.openDatabase.bind(this));
      document.getElementById('create-db').addEventListener('click', this.createDatabase.bind(this));
      
      // Set up tab navigation
      document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
          const tabId = button.getAttribute('data-tab');
          
          // Hide all tab content
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Remove active class from all tab buttons
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Show the selected tab content
          document.getElementById(tabId).classList.add('active');
          
          // Add active class to the clicked tab button
          button.classList.add('active');
          
          // If parts tab, refresh parts list
          if (tabId === 'parts-tab') {
            this.refreshPartsList();
          }
        });
      });
      
      // Initialize SQL.js
      try {
        await window.DatabaseService.initSqlJs();
        window.DOMUtils.showToast('Application initialized', 'success');
      } catch (err) {
        console.error('Error initializing application:', err);
        window.DOMUtils.showToast('Error initializing application', 'error');
      }
    },
    
    // Open an existing database
    openDatabase: async function() {
      try {
        // Open file
        const fileBuffer = await (window.FileService.supportsFileSystemAccessAPI() ? 
          window.FileService.openFile() : 
          window.FileService.openFileLegacy());
        
        // Load database
        await window.DatabaseService.loadDatabase(fileBuffer);
        
        // Initialize UI
        this.initializeUI();
        
        // Update file info
        this.updateFileInfo();
        
        window.DOMUtils.showToast('Database opened successfully', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error opening database:', err);
          window.DOMUtils.showToast('Error opening database', 'error');
        }
      }
    },
    
    // Create a new database
    createDatabase: async function() {
      try {
        // Create database
        await window.DatabaseService.createDatabase();
        
        // Initialize UI
        this.initializeUI();
        
        // Reset file info
        document.getElementById('current-file').textContent = 'New database (unsaved)';
        document.getElementById('file-info').classList.remove('hidden');
        
        // Set unsaved changes
        hasUnsavedChanges = true;
        this.updateSaveStatus();
        
        window.DOMUtils.showToast('New database created', 'success');
      } catch (err) {
        console.error('Error creating database:', err);
        window.DOMUtils.showToast('Error creating database', 'error');
      }
    },
    
    // Initialize the UI after opening or creating a database
    initializeUI: function() {
      // Show app container
      document.getElementById('app-container').classList.remove('hidden');
      
      // Initialize components
      this.initPartsList();
      this.initTimelineView();
      
      // Refresh the parts list
      this.refreshPartsList();
    },
    
    // Update file info display
    updateFileInfo: function() {
      const currentFile = window.FileService.getCurrentFileName() || 'New database (unsaved)';
      document.getElementById('current-file').textContent = currentFile;
      document.getElementById('file-info').classList.remove('hidden');
    },
    
    // Update save status display
    updateSaveStatus: function() {
      const statusElement = document.getElementById('save-status');
      
      if (hasUnsavedChanges) {
        statusElement.textContent = 'Unsaved';
        statusElement.classList.remove('saved');
        statusElement.classList.add('unsaved');
      } else {
        statusElement.textContent = 'Saved';
        statusElement.classList.remove('unsaved');
        statusElement.classList.add('saved');
      }
    },
    
    // Save the database to file
    saveDatabase: async function() {
      try {
        if (!window.DatabaseService.getDatabase()) {
          window.DOMUtils.showToast('No database to save', 'error');
          return;
        }
        
        // Export database
        const data = window.DatabaseService.exportDatabase();
        
        // Save to file
        await window.FileService.saveFile(data);
        
        // Update status
        hasUnsavedChanges = false;
        this.updateSaveStatus();
        
        // Update file info
        this.updateFileInfo();
        
        window.DOMUtils.showToast('Database saved successfully', 'success');
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error saving database:', err);
          window.DOMUtils.showToast('Error saving database', 'error');
        }
        return false;
      }
    },
    
    // Initialize the parts list component
    initPartsList: function() {
      // Will be implemented in parts-list.js
      if (window.PartsList && typeof window.PartsList.init === 'function') {
        window.PartsList.init();
      }
    },
    
    // Refresh the parts list
    refreshPartsList: function() {
      // Will be implemented in parts-list.js
      if (window.PartsList && typeof window.PartsList.refresh === 'function') {
        window.PartsList.refresh();
      }
    },
    
    // Initialize the timeline view component
    initTimelineView: function() {
      // Will be implemented in timeline-view.js
      if (window.TimelineView && typeof window.TimelineView.init === 'function') {
        window.TimelineView.init();
      }
    }
  };
})();

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});