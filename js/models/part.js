/**
 * Part model for PC History Tracker
 */

// Create PartModel namespace
window.PartModel = (function() {
  // Part types
  const PART_TYPES = [
    'motherboard',
    'cpu',
    'gpu',
    'ram',
    'storage',
    'psu',
    'case',
    'cooling',
    'monitor',
    'peripheral',
    'other'
  ];
  
  return {
    /**
     * Get all parts
     * @param {Object} filters - Optional filters
     * @param {string} sortColumn - Column to sort by
     * @param {string} sortDirection - Sort direction ('asc' or 'desc')
     * @returns {Array} Array of part objects
     */
    getAllParts: function(filters = {}, sortColumn = 'id', sortDirection = 'asc') {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      // Build WHERE clause based on filters
      const whereConditions = [];
      
      // Type filter
      if (filters.type && filters.type !== 'all') {
        whereConditions.push(`p.type = '${filters.type}'`);
      }
      
      // Status filter
      if (filters.status && filters.status !== 'all') {
        switch (filters.status) {
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
      if (filters.search && filters.search.trim() !== '') {
        const searchTerm = filters.search.trim().replace(/'/g, "''"); // Escape single quotes
        whereConditions.push(`
          (p.brand LIKE '%${searchTerm}%' OR 
           p.model LIKE '%${searchTerm}%' OR 
           p.notes LIKE '%${searchTerm}%')
        `);
      }
      
      // Combine all WHERE conditions
      let whereClause = '';
      if (whereConditions.length > 0) {
        whereClause = 'WHERE ' + whereConditions.join(' AND ');
      }
      
      // Build ORDER BY clause based on sort
      let orderByClause = '';
      
      switch (sortColumn) {
        case 'id':
          orderByClause = `p.id ${sortDirection}`;
          break;
        case 'brand':
          orderByClause = `p.brand ${sortDirection}, p.model ASC`;
          break;
        case 'model':
          orderByClause = `p.model ${sortDirection}, p.brand ASC`;
          break;
        case 'type':
          orderByClause = `p.type ${sortDirection}, p.brand ASC, p.model ASC`;
          break;
        case 'acquisition_date':
          orderByClause = `p.acquisition_date ${sortDirection}, p.brand ASC, p.model ASC`;
          break;
        case 'status':
          orderByClause = `status_order ${sortDirection}, p.brand ASC, p.model ASC`;
          break;
        default:
          orderByClause = `p.id ${sortDirection}`;
      }
      
      // Execute the query
      const query = `
        SELECT 
          p.id,
          p.brand,
          p.model,
          p.type,
          p.acquisition_date,
          p.date_precision,
          p.notes,
          p.is_deleted,
          CASE
            WHEN p.is_deleted = 1 THEN 'deleted'
            WHEN p.type = 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL) THEN 'active'
            WHEN p.type != 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL) THEN 'active'
            ELSE 'bin'
          END as status,
          CASE
            WHEN p.is_deleted = 1 THEN 2
            WHEN (p.type = 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL))
              OR (p.type != 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL)) THEN 0
            ELSE 1
          END as status_order,
          CASE
            WHEN p.type = 'motherboard' THEN (SELECT COUNT(*) FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL)
            ELSE (SELECT COUNT(*) FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL)
          END as active_connections,
          (SELECT name FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as rig_name
        FROM parts p
        ${whereClause}
        ORDER BY ${orderByClause}
      `;
      
      try {
        const result = db.exec(query);
        if (result.length === 0) return [];
        
        // Map column names to values
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const part = {};
          columns.forEach((column, index) => {
            part[column] = row[index];
          });
          return part;
        });
      } catch (err) {
        console.error('Error getting parts:', err);
        throw err;
      }
    },
    
    /**
     * Get a part by ID
     * @param {number} id - Part ID
     * @returns {Object} Part object
     */
    getPartById: function(id) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        const query = `
          SELECT 
            p.id,
            p.brand,
            p.model,
            p.type,
            p.acquisition_date,
            p.date_precision,
            p.notes,
            p.is_deleted,
            CASE
              WHEN p.is_deleted = 1 THEN 'deleted'
              WHEN p.type = 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL) THEN 'active'
              WHEN p.type != 'motherboard' AND EXISTS (SELECT 1 FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL) THEN 'active'
              ELSE 'bin'
            END as status,
            CASE
              WHEN p.type = 'motherboard' THEN (SELECT COUNT(*) FROM connections c WHERE c.motherboard_id = p.id AND c.disconnected_at IS NULL)
              ELSE (SELECT COUNT(*) FROM connections c WHERE c.part_id = p.id AND c.disconnected_at IS NULL)
            END as active_connections,
            (SELECT name FROM rig_identities ri WHERE ri.motherboard_id = p.id AND ri.active_until IS NULL ORDER BY ri.active_from DESC LIMIT 1) as rig_name
          FROM parts p
          WHERE p.id = ${id}
        `;
        
        const result = db.exec(query);
        if (result.length === 0 || result[0].values.length === 0) {
          return null;
        }
        
        // Map column names to values
        const columns = result[0].columns;
        const row = result[0].values[0];
        
        const part = {};
        columns.forEach((column, index) => {
          part[column] = row[index];
        });
        
        return part;
      } catch (err) {
        console.error(`Error getting part with ID ${id}:`, err);
        throw err;
      }
    },
    
    /**
     * Add a new part
     * @param {Object} part - Part data
     * @returns {number} New part ID
     */
    addPart: function(part) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        // Validate part data
        if (!part.brand || !part.model || !part.type) {
          throw new Error('Brand, model, and type are required');
        }
        
        if (!PART_TYPES.includes(part.type)) {
          throw new Error(`Invalid part type: ${part.type}`);
        }
        
        // Insert the part
        const query = `
          INSERT INTO parts (brand, model, type, acquisition_date, date_precision, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          part.brand,
          part.model,
          part.type,
          part.acquisition_date || null,
          part.date_precision || 'day',
          part.notes || ''
        ];
        
        db.run(query, params);
        
        // Get the last inserted ID
        const result = db.exec('SELECT last_insert_rowid()');
        return result[0].values[0][0];
      } catch (err) {
        console.error('Error adding part:', err);
        throw err;
      }
    },
    
    /**
     * Update a part
     * @param {number} id - Part ID
     * @param {Object} part - Part data
     */
    updatePart: function(id, part) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        // Validate part data
        if (!part.brand || !part.model || !part.type) {
          throw new Error('Brand, model, and type are required');
        }
        
        if (!PART_TYPES.includes(part.type)) {
          throw new Error(`Invalid part type: ${part.type}`);
        }
        
        // Update the part
        const query = `
          UPDATE parts
          SET brand = ?,
              model = ?,
              type = ?,
              acquisition_date = ?,
              date_precision = ?,
              notes = ?
          WHERE id = ?
        `;
        
        const params = [
          part.brand,
          part.model,
          part.type,
          part.acquisition_date || null,
          part.date_precision || 'day',
          part.notes || '',
          id
        ];
        
        db.run(query, params);
      } catch (err) {
        console.error(`Error updating part with ID ${id}:`, err);
        throw err;
      }
    },
    
    /**
     * Mark a part as deleted (soft delete)
     * @param {number} id - Part ID
     */
    deletePart: function(id) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        db.run(`UPDATE parts SET is_deleted = 1 WHERE id = ${id}`);
      } catch (err) {
        console.error(`Error deleting part with ID ${id}:`, err);
        throw err;
      }
    },
    
    /**
     * Permanently delete a part and all related data
     * @param {number} id - Part ID
     */
    hardDeletePart: function(id) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        // Begin transaction
        db.run('BEGIN TRANSACTION');
        
        // Delete related data
        db.run(`DELETE FROM connections WHERE part_id = ${id} OR motherboard_id = ${id}`);
        db.run(`DELETE FROM rig_identities WHERE motherboard_id = ${id}`);
        db.run(`DELETE FROM disposals WHERE part_id = ${id}`);
        
        // Delete the part
        db.run(`DELETE FROM parts WHERE id = ${id}`);
        
        // Commit transaction
        db.run('COMMIT');
      } catch (err) {
        // Rollback transaction on error
        db.run('ROLLBACK');
        console.error(`Error hard deleting part with ID ${id}:`, err);
        throw err;
      }
    },
    
    /**
     * Get parts in the bin (not connected to any rig)
     * @param {string} type - Filter by part type (optional)
     * @returns {Array} Array of part objects
     */
    getPartsInBin: function(type = null) {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      let typeFilter = '';
      if (type && type !== 'all') {
        typeFilter = `AND p.type = '${type}'`;
      }
      
      try {
        const query = `
          SELECT 
            p.id,
            p.brand,
            p.model,
            p.type,
            p.acquisition_date,
            p.date_precision,
            p.notes
          FROM parts p
          WHERE p.is_deleted = 0
            AND NOT EXISTS (
              SELECT 1 FROM connections c 
              WHERE (c.part_id = p.id OR c.motherboard_id = p.id) 
              AND c.disconnected_at IS NULL
            )
            ${typeFilter}
          ORDER BY p.type, p.brand, p.model
        `;
        
        const result = db.exec(query);
        if (result.length === 0) return [];
        
        // Map column names to values
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const part = {};
          columns.forEach((column, index) => {
            part[column] = row[index];
          });
          return part;
        });
      } catch (err) {
        console.error('Error getting parts in bin:', err);
        throw err;
      }
    },
    
    /**
     * Get unique brands for autocomplete
     * @returns {Array} Array of brand names
     */
    getUniqueBrands: function() {
      const db = DatabaseService.getDatabase();
      if (!db) throw new Error('No database is open');
      
      try {
        const query = `
          SELECT DISTINCT brand
          FROM parts
          ORDER BY brand
        `;
        
        const result = db.exec(query);
        if (result.length === 0) return [];
        
        return result[0].values.map(row => row[0]);
      } catch (err) {
        console.error('Error getting unique brands:', err);
        throw err;
      }
    }
  };
})();