/**
 * Unit tests for CodeIndexService
 */

const CodeIndexService = require('../../src/services/CodeIndexService');

describe('CodeIndexService', () => {
  let codeIndexService;
  let mockDatabaseService;

  beforeEach(() => {
    mockDatabaseService = {
      getFileMetadata: jest.fn().mockResolvedValue(null),
      upsertFileMetadata: jest.fn().mockResolvedValue(),
      deleteSymbolsForFile: jest.fn().mockResolvedValue(),
      deleteImportsForFile: jest.fn().mockResolvedValue(),
      insertSymbol: jest.fn().mockResolvedValue(),
      insertImport: jest.fn().mockResolvedValue(),
      findSymbolsByName: jest.fn().mockResolvedValue([]),
      findImportersBySymbol: jest.fn().mockResolvedValue([]),
      clearProjectIndex: jest.fn().mockResolvedValue(),
      getIndexStats: jest.fn().mockResolvedValue({
        totalSymbols: 10,
        totalImports: 5,
        totalFiles: 3,
        indexedFiles: 3,
      }),
    };

    codeIndexService = new CodeIndexService(mockDatabaseService);
  });

  describe('constructor', () => {
    it('should initialize with database service', () => {
      expect(codeIndexService.db).toBe(mockDatabaseService);
      expect(codeIndexService.projectRoot).toBeNull();
      expect(codeIndexService.projectId).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should set project root and id', async () => {
      await codeIndexService.initialize('/project', 123);

      expect(codeIndexService.projectRoot).toBe('/project');
      expect(codeIndexService.projectId).toBe(123);
    });
  });

  describe('extractJavaScriptSymbols', () => {
    it('should extract function declarations', () => {
      const code = 'function myFunction() { return 1; }';
      const symbols = codeIndexService.extractJavaScriptSymbols(code, 'test.js');

      expect(symbols.length).toBe(1);
      expect(symbols[0].symbol_name).toBe('myFunction');
      expect(symbols[0].symbol_type).toBe('function');
      expect(symbols[0].is_exported).toBe(false);
    });

    it('should extract exported functions', () => {
      const code = 'export function exportedFunc() {}';
      const symbols = codeIndexService.extractJavaScriptSymbols(code, 'test.js');

      expect(symbols.length).toBe(1);
      expect(symbols[0].symbol_name).toBe('exportedFunc');
      expect(symbols[0].is_exported).toBe(true);
    });

    it('should extract arrow functions', () => {
      const code = 'const arrowFunc = () => {}';
      const symbols = codeIndexService.extractJavaScriptSymbols(code, 'test.js');

      expect(symbols.length).toBeGreaterThan(0);
      const arrow = symbols.find(s => s.symbol_name === 'arrowFunc');
      expect(arrow).toBeDefined();
    });

    it('should extract classes', () => {
      const code = 'class MyClass {}';
      const symbols = codeIndexService.extractJavaScriptSymbols(code, 'test.js');

      expect(symbols.length).toBe(1);
      expect(symbols[0].symbol_name).toBe('MyClass');
      expect(symbols[0].symbol_type).toBe('class');
    });

    it('should extract constants', () => {
      const code = 'const MY_CONSTANT = 42';
      const symbols = codeIndexService.extractJavaScriptSymbols(code, 'test.js');

      const constant = symbols.find(s => s.symbol_name === 'MY_CONSTANT');
      expect(constant).toBeDefined();
      expect(constant.symbol_type).toBe('constant');
    });

    it('should handle multiple symbols per file', () => {
      const code = [
        'function foo() {}',
        'const bar = 1;',
        'class Baz {}',
      ].join(String.fromCharCode(10));

      const symbols = codeIndexService.extractJavaScriptSymbols(code, 'test.js');

      expect(symbols.length).toBe(3);
    });
  });

  describe('extractJavaScriptImports', () => {
    it('should extract default imports', () => {
      const code = "import React from 'react';";
      const imports = codeIndexService.extractJavaScriptImports(code, 'test.js');

      expect(imports.length).toBe(1);
      expect(imports[0].imported_symbol).toBe('React');
      expect(imports[0].imported_from).toBe('react');
      expect(imports[0].import_type).toBe('default');
    });

    it('should extract named imports', () => {
      const code = "import { useState, useEffect } from 'react';";
      const imports = codeIndexService.extractJavaScriptImports(code, 'test.js');

      expect(imports.length).toBe(2);
      expect(imports[0].imported_symbol).toBe('useState');
      expect(imports[1].imported_symbol).toBe('useEffect');
      expect(imports[0].import_type).toBe('named');
    });

    it('should extract namespace imports', () => {
      const code = "import * as React from 'react';";
      const imports = codeIndexService.extractJavaScriptImports(code, 'test.js');

      expect(imports.length).toBe(1);
      expect(imports[0].imported_symbol).toBe('React');
      expect(imports[0].import_type).toBe('namespace');
    });

    it('should extract require imports', () => {
      const code = "const path = require('path');";
      const imports = codeIndexService.extractJavaScriptImports(code, 'test.js');

      expect(imports.length).toBe(1);
      expect(imports[0].imported_symbol).toBe('path');
      expect(imports[0].imported_from).toBe('path');
    });
  });

  describe('extractTypeScriptSymbols', () => {
    it('should extract interfaces', () => {
      const code = 'interface MyInterface {}';
      const symbols = codeIndexService.extractTypeScriptSymbols(code, 'test.ts');

      const iface = symbols.find(s => s.symbol_name === 'MyInterface');
      expect(iface).toBeDefined();
      expect(iface.symbol_type).toBe('interface');
    });

    it('should extract type aliases', () => {
      const code = 'type MyType = string | number;';
      const symbols = codeIndexService.extractTypeScriptSymbols(code, 'test.ts');

      const typeAlias = symbols.find(s => s.symbol_name === 'MyType');
      expect(typeAlias).toBeDefined();
      expect(typeAlias.symbol_type).toBe('type');
    });

    it('should extract enums', () => {
      const code = 'enum Color { Red, Green, Blue }';
      const symbols = codeIndexService.extractTypeScriptSymbols(code, 'test.ts');

      const enumSymbol = symbols.find(s => s.symbol_name === 'Color');
      expect(enumSymbol).toBeDefined();
      expect(enumSymbol.symbol_type).toBe('enum');
    });
  });

  describe('extractPythonSymbols', () => {
    it('should extract functions', () => {
      const code = 'def my_function():' + String.fromCharCode(10) + '    pass';
      const symbols = codeIndexService.extractPythonSymbols(code, 'test.py');

      expect(symbols.length).toBe(1);
      expect(symbols[0].symbol_name).toBe('my_function');
      expect(symbols[0].symbol_type).toBe('function');
    });

    it('should extract classes', () => {
      const code = 'class MyClass:' + String.fromCharCode(10) + '    pass';
      const symbols = codeIndexService.extractPythonSymbols(code, 'test.py');

      expect(symbols.length).toBe(1);
      expect(symbols[0].symbol_name).toBe('MyClass');
      expect(symbols[0].symbol_type).toBe('class');
    });

    it('should mark private functions as not exported', () => {
      const code = 'def _private_func():' + String.fromCharCode(10) + '    pass';
      const symbols = codeIndexService.extractPythonSymbols(code, 'test.py');

      expect(symbols[0].is_exported).toBe(false);
    });
  });

  describe('extractPythonImports', () => {
    it('should extract simple imports', () => {
      const code = 'import os';
      const imports = codeIndexService.extractPythonImports(code, 'test.py');

      expect(imports.length).toBe(1);
      expect(imports[0].imported_symbol).toBe('os');
    });

    it('should extract from imports', () => {
      const code = 'from os import path, getcwd';
      const imports = codeIndexService.extractPythonImports(code, 'test.py');

      expect(imports.length).toBe(2);
      expect(imports[0].imported_symbol).toBe('path');
      expect(imports[0].imported_from).toBe('os');
    });
  });

  describe('findDefinition', () => {
    beforeEach(async () => {
      await codeIndexService.initialize('/project', 123);
    });

    it('should query database for symbol', async () => {
      mockDatabaseService.findSymbolsByName.mockResolvedValue([
        { file_path: 'test.js', line_number: 10 },
      ]);

      const results = await codeIndexService.findDefinition('myFunc');

      expect(mockDatabaseService.findSymbolsByName).toHaveBeenCalledWith(123, 'myFunc');
      expect(results.length).toBe(1);
    });

    it('should throw if not initialized', async () => {
      const uninitializedService = new CodeIndexService(mockDatabaseService);

      await expect(uninitializedService.findDefinition('test')).rejects.toThrow(/not initialized/);
    });
  });

  describe('findImporters', () => {
    beforeEach(async () => {
      await codeIndexService.initialize('/project', 123);
    });

    it('should query database for importers', async () => {
      mockDatabaseService.findImportersBySymbol.mockResolvedValue([
        { source_file: 'app.js', line_number: 1 },
      ]);

      const results = await codeIndexService.findImporters('myUtil');

      expect(mockDatabaseService.findImportersBySymbol).toHaveBeenCalledWith(123, 'myUtil');
      expect(results.length).toBe(1);
    });
  });

  describe('clearIndex', () => {
    beforeEach(async () => {
      await codeIndexService.initialize('/project', 123);
    });

    it('should clear index in database', async () => {
      await codeIndexService.clearIndex();

      expect(mockDatabaseService.clearProjectIndex).toHaveBeenCalledWith(123);
    });
  });

  describe('getIndexStats', () => {
    beforeEach(async () => {
      await codeIndexService.initialize('/project', 123);
    });

    it('should return index statistics', async () => {
      const stats = await codeIndexService.getIndexStats();

      expect(stats.totalSymbols).toBe(10);
      expect(stats.totalImports).toBe(5);
      expect(mockDatabaseService.getIndexStats).toHaveBeenCalledWith(123);
    });
  });
});
