/**
 * Mock better-sqlite3 for Jest testing
 *
 * Provides an in-memory mock database that simulates SQLite behavior
 */

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    const result = this.db._execute(this.sql, params, 'run');
    return {
      changes: result.changes || 0,
      lastInsertRowid: result.lastInsertRowid || this.db._lastId,
    };
  }

  get(...params) {
    const rows = this.db._execute(this.sql, params, 'get');
    return Array.isArray(rows) ? rows[0] : rows;
  }

  all(...params) {
    const result = this.db._execute(this.sql, params, 'all');
    return Array.isArray(result) ? result : [];
  }
}

class MockDatabase {
  constructor(filename, options = {}) {
    this.filename = filename;
    this.options = options;
    this._tables = {};
    this._lastId = 0;
    this._open = true;
  }

  pragma(statement) {
    // Ignore pragma statements in mock
    return this;
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }

  exec(sql) {
    // Handle CREATE TABLE statements
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (createMatch) {
      const tableName = createMatch[1];
      if (!this._tables[tableName]) {
        this._tables[tableName] = [];
      }
      return;
    }

    // Handle CREATE INDEX (ignore)
    if (sql.match(/CREATE INDEX/i)) {
      return;
    }

    // Handle INSERT OR IGNORE for default settings
    const insertMatch = sql.match(/INSERT OR IGNORE INTO (\w+)/i);
    if (insertMatch) {
      // Parse and execute inserts
      const tableName = insertMatch[1];
      if (!this._tables[tableName]) {
        this._tables[tableName] = [];
      }

      // Parse column names
      const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      const columns = columnsMatch
        ? columnsMatch[1].split(',').map(c => c.trim())
        : ['key', 'value']; // fallback for settings

      // Extract all value tuples (handles multi-value INSERT)
      const valuesSection = sql.match(/VALUES\s*([\s\S]+)$/i);
      if (valuesSection) {
        // Match all tuples: ('val1', 'val2'), ('val3', 'val4'), ...
        const tupleMatches = valuesSection[1].match(/\(([^)]+)\)/g);
        if (tupleMatches) {
          tupleMatches.forEach((tuple) => {
            const values = tuple
              .replace(/^\(/, '')
              .replace(/\)$/, '')
              .split(',')
              .map((s) => s.trim().replace(/^'|'$/g, ''));

            // Create row object from columns
            const row = { id: ++this._lastId };
            columns.forEach((col, i) => {
              row[col] = values[i];
            });

            // Check for existing entry (INSERT OR IGNORE)
            const pkColumn = columns[0]; // First column is typically the key
            const existing = this._tables[tableName].find((r) => r[pkColumn] === row[pkColumn]);
            if (!existing) {
              this._tables[tableName].push(row);
            }
          });
        }
      }
      return;
    }
  }

  _execute(sql, params, mode) {
    const sqlLower = sql.toLowerCase().trim();

    // INSERT
    if (sqlLower.startsWith('insert')) {
      return this._handleInsert(sql, params);
    }

    // SELECT
    if (sqlLower.startsWith('select')) {
      return this._handleSelect(sql, params);
    }

    // UPDATE
    if (sqlLower.startsWith('update')) {
      return this._handleUpdate(sql, params);
    }

    // DELETE
    if (sqlLower.startsWith('delete')) {
      return this._handleDelete(sql, params);
    }

    return mode === 'all' ? [] : { changes: 0 };
  }

  _handleInsert(sql, params) {
    const tableMatch = sql.match(/INSERT(?:\s+OR\s+\w+)?\s+INTO\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };

    const tableName = tableMatch[1];
    if (!this._tables[tableName]) {
      this._tables[tableName] = [];
    }

    // Parse column names
    const columnsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (!columnsMatch) return { changes: 0 };

    const columns = columnsMatch[1].split(',').map((c) => c.trim());

    // Check for ON CONFLICT (upsert)
    const isUpsert = sql.toLowerCase().includes('on conflict');
    const conflictMatch = sql.match(/ON CONFLICT\(([^)]+)\)/i);
    const conflictColumns = conflictMatch
      ? conflictMatch[1].split(',').map((c) => c.trim())
      : null;

    // Create row object
    const row = { id: ++this._lastId };
    columns.forEach((col, i) => {
      row[col] = params[i];
    });

    // Apply table-specific defaults (simulating SQLite DEFAULT values)
    if (tableName === 'sessions') {
      if (row.is_archived === undefined) row.is_archived = 0;
      if (row.created_at === undefined) row.created_at = new Date().toISOString();
      if (row.last_accessed === undefined) row.last_accessed = new Date().toISOString();
    }

    // Handle upsert
    if (isUpsert && conflictColumns) {
      const existingIndex = this._tables[tableName].findIndex((r) => {
        return conflictColumns.every((col) => r[col] === row[col]);
      });

      if (existingIndex >= 0) {
        // Update existing row - preserve original id
        const existingId = this._tables[tableName][existingIndex].id;
        Object.assign(this._tables[tableName][existingIndex], row);
        this._tables[tableName][existingIndex].id = existingId;
        this._lastId--; // Don't increment ID for updates
        return { changes: 1, lastInsertRowid: existingId };
      }
    }

    // Check for OR REPLACE
    if (sql.toLowerCase().includes('or replace')) {
      const pkColumn = columns[0]; // Assume first column is PK
      const existingIndex = this._tables[tableName].findIndex(
        (r) => r[pkColumn] === row[pkColumn]
      );
      if (existingIndex >= 0) {
        const existingId = this._tables[tableName][existingIndex].id;
        row.id = existingId;
        this._tables[tableName][existingIndex] = row;
        this._lastId--; // Don't increment ID for replacements
        return { changes: 1, lastInsertRowid: row.id };
      }
    }

    this._tables[tableName].push(row);
    return { changes: 1, lastInsertRowid: row.id };
  }

  _handleSelect(sql, params) {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const table = this._tables[tableName] || [];

    // Parse WHERE conditions
    let results = [...table];
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)/is);

    if (whereMatch) {
      const whereClause = whereMatch[1].trim();

      results = results.filter((row) => {
        // Reset paramIndex for each row
        let paramIndex = 0;
        // Handle AND/OR conditions
        const conditions = whereClause.split(/\s+AND\s+/i);
        return conditions.every((condition) => {
          // Skip time-based conditions
          if (condition.includes('datetime(')) return true;
          if (condition.trim() === '1=1') return true;

          // Handle equality with parameter
          const eqMatch = condition.match(/(\w+)\s*=\s*\?/);
          if (eqMatch) {
            const col = eqMatch[1];
            const val = params[paramIndex++];
            return row[col] === val;
          }

          // Handle equality with string literal
          const literalMatch = condition.match(/(\w+)\s*=\s*'([^']+)'/);
          if (literalMatch) {
            const col = literalMatch[1];
            const val = literalMatch[2];
            return row[col] === val;
          }

          // Handle equality with numeric literal
          const numericMatch = condition.match(/(\w+)\s*=\s*(\d+)/);
          if (numericMatch) {
            const col = numericMatch[1];
            const val = parseInt(numericMatch[2], 10);
            return row[col] === val;
          }

          return true;
        });
      });
    }

    // Handle GROUP BY
    const hasGroupBy = sql.toLowerCase().includes('group by');
    if (hasGroupBy) {
      const groupMatch = sql.match(/GROUP BY\s+(.+?)(?:\s+ORDER|\s*$)/is);
      if (groupMatch) {
        const groupCols = groupMatch[1].split(',').map((c) => c.trim());
        const groups = {};

        results.forEach((row) => {
          const key = groupCols.map((c) => row[c]).join('|');
          if (!groups[key]) {
            // Initialize group with first row's group columns
            groups[key] = { _rows: [] };
            groupCols.forEach((c) => {
              groups[key][c] = row[c];
            });
          }
          groups[key]._rows.push(row);
        });

        // Calculate aggregations for each group
        results = Object.values(groups).map((group) => {
          const rows = group._rows;
          delete group._rows;

          return {
            ...group,
            call_count: rows.length,
            count: rows.length,
            total_input_tokens: rows.reduce((sum, r) => sum + (r.input_tokens || 0), 0),
            total_output_tokens: rows.reduce((sum, r) => sum + (r.output_tokens || 0), 0),
            total_cost_usd: rows.reduce((sum, r) => sum + (r.cost_usd || 0), 0),
          };
        });
      }
    }

    // Handle aggregation queries (COUNT, SUM) for non-grouped queries
    const hasCount = sql.toLowerCase().includes('count(*)');
    const hasSum = sql.toLowerCase().includes('sum(');

    if ((hasCount || hasSum) && !hasGroupBy) {
      const agg = {
        count: results.length,
        call_count: results.length,
        total_input_tokens: results.reduce((sum, r) => sum + (r.input_tokens || 0), 0),
        total_output_tokens: results.reduce((sum, r) => sum + (r.output_tokens || 0), 0),
        total_cost_usd: results.reduce((sum, r) => sum + (r.cost_usd || 0), 0),
      };
      return [agg];
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i);
    if (orderMatch) {
      const orderCols = orderMatch[1].split(',').map((c) => {
        const parts = c.trim().split(/\s+/);
        return { col: parts[0], desc: parts[1]?.toLowerCase() === 'desc' };
      });

      results.sort((a, b) => {
        for (const { col, desc } of orderCols) {
          const aVal = a[col];
          const bVal = b[col];
          if (aVal < bVal) return desc ? 1 : -1;
          if (aVal > bVal) return desc ? -1 : 1;
        }
        return 0;
      });
    }

    return results;
  }

  _handleUpdate(sql, params) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };

    const tableName = tableMatch[1];
    const table = this._tables[tableName] || [];

    // Parse SET clause
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    if (!setMatch) return { changes: 0 };

    // Parse WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+)$/i);
    if (!whereMatch) return { changes: 0 };

    // Count SET parameters
    const setClauses = setMatch[1].split(',');
    const setParams = (setMatch[1].match(/\?/g) || []).length;

    let changes = 0;

    table.forEach((row) => {
      // Check WHERE conditions
      const whereClause = whereMatch[1];
      const conditions = whereClause.split(/\s+AND\s+/i);
      let whereParamIndex = setParams;

      const matches = conditions.every((condition) => {
        const eqMatch = condition.match(/(\w+)\s*=\s*\?/);
        if (eqMatch) {
          const col = eqMatch[1];
          const val = params[whereParamIndex++];
          return row[col] === val;
        }
        return true;
      });

      if (matches) {
        // Apply SET values
        let setParamIdx = 0;
        setClauses.forEach((clause) => {
          const colMatch = clause.match(/(\w+)\s*=/);
          if (colMatch) {
            const col = colMatch[1].trim();
            if (clause.includes('?')) {
              row[col] = params[setParamIdx++];
            } else if (clause.toLowerCase().includes('current_timestamp')) {
              row[col] = new Date().toISOString();
            } else {
              // Handle literal values (numbers, strings)
              const numMatch = clause.match(/=\s*(\d+)/);
              if (numMatch) {
                row[col] = parseInt(numMatch[1], 10);
              } else {
                const strMatch = clause.match(/=\s*'([^']+)'/);
                if (strMatch) {
                  row[col] = strMatch[1];
                }
              }
            }
          }
        });
        changes++;
      }
    });

    return { changes };
  }

  _handleDelete(sql, params) {
    const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };

    const tableName = tableMatch[1];
    if (!this._tables[tableName]) return { changes: 0 };

    const whereMatch = sql.match(/WHERE\s+(.+)$/i);
    if (!whereMatch) {
      const changes = this._tables[tableName].length;
      this._tables[tableName] = [];
      return { changes };
    }

    const originalLength = this._tables[tableName].length;

    this._tables[tableName] = this._tables[tableName].filter((row) => {
      const conditions = whereMatch[1].split(/\s+AND\s+/i);
      let paramIndex = 0;

      const shouldDelete = conditions.every((condition) => {
        const eqMatch = condition.match(/(\w+)\s*=\s*\?/);
        if (eqMatch) {
          const col = eqMatch[1];
          const val = params[paramIndex++];
          return row[col] === val;
        }
        return true;
      });
      return !shouldDelete;
    });

    return { changes: originalLength - this._tables[tableName].length };
  }

  close() {
    this._open = false;
  }
}

module.exports = MockDatabase;
