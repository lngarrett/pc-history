/**
 * Database service for PC History Tracker
 * Handles all database operations
 */

// Create DatabaseService namespace
window.DatabaseService = (function() {
  // Private variables
  let db = null;
  let SQL = null;
  
  return {
    /**
     * Initialize SQL.js library
     */
    initSqlJs: async function() {
      // Check if SQL is already initialized
      if (SQL) return SQL;
      
      try {
        // Initialize SQL.js
        SQL = await this.initSqlJsAsync();
        return SQL;
      } catch (err) {
        console.error('Error initializing SQL.js:', err);
        throw err;
      }
    },
    
    /**
     * Create a promise-based wrapper for SQL.js initialization
     */
    initSqlJsAsync: function() {
      return new Promise((resolve, reject) => {
        try {
          // Initialize SQL.js with the wasm file
          const sqlJs = window.initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
          });
          resolve(sqlJs);
        } catch (err) {
          reject(err);
        }
      });
    },
    
    /**
     * Create a new database
     */
    createDatabase: async function() {
      try {
        const SQL = await this.initSqlJs();
        db = new SQL.Database();
        await this.setupSchema();
        return db;
      } catch (err) {
        console.error('Error creating database:', err);
        throw err;
      }
    },
    
    /**
     * Load database from array buffer
     * @param {ArrayBuffer} buffer - The database file buffer
     */
    loadDatabase: async function(buffer) {
      try {
        const SQL = await this.initSqlJs();
        db = new SQL.Database(new Uint8Array(buffer));
        return db;
      } catch (err) {
        console.error('Error loading database:', err);
        throw err;
      }
    },
    
    /**
     * Save database to array buffer
     * @returns {Uint8Array} - Database as array buffer
     */
    exportDatabase: function() {
      if (!db) throw new Error('No database is open');
      return db.export();
    },
    
    /**
     * Get current database instance
     * @returns {Object} - SQL.js database instance
     */
    getDatabase: function() {
      return db;
    },
    
    /**
     * Close the database
     */
    closeDatabase: function() {
      if (db) {
        db.close();
        db = null;
      }
    },
    
    /**
     * Setup the database schema
     */
    setupSchema: async function() {
      if (!db) throw new Error('No database is open');
      
      // Create parts table
      db.run(`
        CREATE TABLE IF NOT EXISTS parts (
          id INTEGER PRIMARY KEY,
          brand TEXT NOT NULL,
          model TEXT NOT NULL,
          type TEXT CHECK(type IN ('motherboard', 'cpu', 'gpu', 'ram', 'storage', 'psu', 'case', 'cooling', 'monitor', 'peripheral', 'other')),
          acquisition_date TEXT,
          date_precision TEXT DEFAULT 'day',
          notes TEXT,
          is_deleted INTEGER DEFAULT 0
        )
      `);
      
      // Create connections table
      db.run(`
        CREATE TABLE IF NOT EXISTS connections (
          id INTEGER PRIMARY KEY,
          motherboard_id INTEGER,
          part_id INTEGER,
          connected_at TEXT NOT NULL,
          connected_precision TEXT DEFAULT 'day',
          disconnected_at TEXT,
          disconnected_precision TEXT DEFAULT 'day',
          notes TEXT,
          FOREIGN KEY (motherboard_id) REFERENCES parts(id),
          FOREIGN KEY (part_id) REFERENCES parts(id)
        )
      `);
      
      // Create rig identities table
      db.run(`
        CREATE TABLE IF NOT EXISTS rig_identities (
          id INTEGER PRIMARY KEY,
          motherboard_id INTEGER,
          name TEXT NOT NULL,
          active_from TEXT NOT NULL,
          active_from_precision TEXT DEFAULT 'day',
          active_until TEXT,
          active_until_precision TEXT DEFAULT 'day',
          notes TEXT,
          FOREIGN KEY (motherboard_id) REFERENCES parts(id) ON DELETE CASCADE
        )
      `);
      
      // Create rig_names table (simpler approach for naming rigs)
      db.run(`
        CREATE TABLE IF NOT EXISTS rig_names (
          id INTEGER PRIMARY KEY,
          motherboard_id INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          name TEXT NOT NULL,
          notes TEXT,
          FOREIGN KEY (motherboard_id) REFERENCES parts(id) ON DELETE CASCADE
        )
      `);
      
      // Create disposals table
      db.run(`
        CREATE TABLE IF NOT EXISTS disposals (
          id INTEGER PRIMARY KEY,
          part_id INTEGER,
          disposed_at TEXT NOT NULL,
          disposed_precision TEXT DEFAULT 'day',
          reason TEXT,
          notes TEXT,
          FOREIGN KEY (part_id) REFERENCES parts(id)
        )
      `);
    },
    
    /**
     * Run a SQL query and return results
     * @param {string} query - SQL query to execute
     * @param {Object} params - Parameters for the SQL query
     * @returns {Object} - Query results
     */
    runQuery: function(query, params = {}) {
      if (!db) throw new Error('No database is open');
      
      try {
        return db.exec(query, params);
      } catch (err) {
        console.error('Error executing query:', query, err);
        throw err;
      }
    }
  };
})();