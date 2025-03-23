/**
 * File service for PC History Tracker
 * Handles all file I/O operations
 */

// Create FileService namespace
window.FileService = (function() {
  // Private variables
  let fileHandle = null;
  let currentFileName = null;
  
  // File system access API support check
  const hasFileSystemAccess = 'showOpenFilePicker' in window;

  return {
    /**
     * Check if the browser supports File System Access API
     * @returns {boolean} - Whether File System Access API is supported
     */
    supportsFileSystemAccessAPI: function() {
      return hasFileSystemAccess;
    },
    
    /**
     * Open a database file using the File System Access API
     * @returns {Promise<ArrayBuffer>} - The database file buffer
     */
    openFile: async function() {
      try {
        if (!hasFileSystemAccess) {
          throw new Error('File System Access API not supported');
        }
        
        // Open file picker
        const opts = {
          types: [
            {
              description: 'SQLite Database Files',
              accept: {
                'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3']
              }
            }
          ],
          excludeAcceptAllOption: false,
          multiple: false
        };
        
        const [handle] = await window.showOpenFilePicker(opts);
        fileHandle = handle;
        
        // Get file name
        currentFileName = handle.name;
        
        // Get file contents
        const file = await handle.getFile();
        return await file.arrayBuffer();
      } catch (err) {
        // User cancelled or other error
        if (err.name !== 'AbortError') {
          console.error('Error opening file:', err);
        }
        throw err;
      }
    },
    
    /**
     * Open a database file using the legacy File API
     * @returns {Promise<ArrayBuffer>} - The database file buffer
     */
    openFileLegacy: function() {
      return new Promise((resolve, reject) => {
        try {
          // Create a file input element
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.db,.sqlite,.sqlite3';
          
          input.addEventListener('change', async () => {
            if (input.files.length === 0) {
              reject(new Error('No file selected'));
              return;
            }
            
            const file = input.files[0];
            currentFileName = file.name;
            
            try {
              const buffer = await file.arrayBuffer();
              resolve(buffer);
            } catch (err) {
              reject(err);
            }
          });
          
          // Trigger file dialog
          input.click();
        } catch (err) {
          reject(err);
        }
      });
    },
    
    /**
     * Save a database file using the File System Access API
     * @param {Uint8Array} data - The database as a Uint8Array
     * @returns {Promise<void>}
     */
    saveFile: async function(data) {
      try {
        if (!fileHandle) {
          return await this.saveFileAs(data);
        }
        
        if (!hasFileSystemAccess) {
          throw new Error('File System Access API not supported');
        }
        
        // Get a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the file
        await writable.write(data);
        await writable.close();
        
        return true;
      } catch (err) {
        console.error('Error saving file:', err);
        throw err;
      }
    },
    
    /**
     * Save a database file as a new file using the File System Access API
     * @param {Uint8Array} data - The database as a Uint8Array
     * @returns {Promise<void>}
     */
    saveFileAs: async function(data) {
      try {
        if (!hasFileSystemAccess) {
          return this.saveFileLegacy(data);
        }
        
        // Open file picker
        const opts = {
          types: [
            {
              description: 'SQLite Database Files',
              accept: {
                'application/x-sqlite3': ['.db']
              }
            }
          ],
          excludeAcceptAllOption: false,
          suggestedName: currentFileName || 'pc-history.db'
        };
        
        fileHandle = await window.showSaveFilePicker(opts);
        
        // Get file name
        currentFileName = fileHandle.name;
        
        // Get a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the file
        await writable.write(data);
        await writable.close();
        
        return true;
      } catch (err) {
        // User cancelled or other error
        if (err.name !== 'AbortError') {
          console.error('Error saving file:', err);
        }
        throw err;
      }
    },
    
    /**
     * Save a database file using the legacy File API (download)
     * @param {Uint8Array} data - The database as a Uint8Array
     * @returns {Promise<void>}
     */
    saveFileLegacy: async function(data) {
      try {
        // Create a blob from the data
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName || 'pc-history.db';
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
        
        return true;
      } catch (err) {
        console.error('Error saving file:', err);
        throw err;
      }
    },
    
    /**
     * Get the current file name
     * @returns {string} - Current file name
     */
    getCurrentFileName: function() {
      return currentFileName;
    },
    
    /**
     * Check if a file is currently open
     * @returns {boolean} - Whether a file is open
     */
    hasOpenFile: function() {
      return fileHandle !== null || currentFileName !== null;
    }
  };
})();