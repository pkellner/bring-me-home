#!/usr/bin/env node

/**
 * Test Analysis and Migration Script
 * Analyzes all test files and provides refactoring recommendations
 */

const fs = require('fs');
const path = require('path');

// Test categories
const categories = {
  serverComponents: [],
  clientComponents: [],
  apiRoutes: [],
  utilities: [],
  unknown: []
};

// Find all test files
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files.push(...findTestFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.test.ts') || item.name.endsWith('.test.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Analyze test file
function analyzeTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  const analysis = {
    path: relativePath,
    type: 'unknown',
    hasRenderCalls: content.includes('render('),
    hasAsyncComponents: content.includes('await') && content.includes('Page'),
    importsReactTestingLibrary: content.includes('@testing-library/react'),
    testsExistence: content.includes('toBeDefined()'),
    recommendation: ''
  };
  
  // Determine type
  if (relativePath.includes('/app/api/')) {
    analysis.type = 'apiRoute';
    categories.apiRoutes.push(analysis);
  } else if (relativePath.includes('/app/') && relativePath.includes('page.test')) {
    analysis.type = 'serverComponent';
    categories.serverComponents.push(analysis);
  } else if (relativePath.includes('/components/')) {
    analysis.type = 'clientComponent';
    categories.clientComponents.push(analysis);
  } else if (relativePath.includes('/lib/') || relativePath.includes('/utils/')) {
    analysis.type = 'utility';
    categories.utilities.push(analysis);
  } else {
    categories.unknown.push(analysis);
  }
  
  // Add recommendations
  switch (analysis.type) {
    case 'serverComponent':
      if (analysis.hasRenderCalls) {
        analysis.recommendation = 'Extract business logic and test separately. Use E2E for full page testing.';
      } else {
        analysis.recommendation = 'Already using simple existence test. Consider extracting any logic.';
      }
      break;
      
    case 'clientComponent':
      if (!analysis.importsReactTestingLibrary) {
        analysis.recommendation = 'Add React Testing Library tests for user interactions.';
      } else {
        analysis.recommendation = 'Good! Continue testing user interactions and edge cases.';
      }
      break;
      
    case 'apiRoute':
      analysis.recommendation = 'Test request/response with mocked dependencies.';
      break;
      
    case 'utility':
      analysis.recommendation = 'Focus on pure function testing with various inputs.';
      break;
  }
  
  return analysis;
}

// Generate migration script
function generateMigrationScript(category, files) {
  const scripts = [];
  
  for (const file of files) {
    if (file.type === 'serverComponent' && file.hasRenderCalls) {
      scripts.push(`
# Refactor ${file.path}
# 1. Extract logic from page component
mkdir -p $(dirname ${file.path.replace('/__tests__', '').replace('.test.tsx', '-logic.ts')})
# 2. Update test to simple existence check
cat > ${file.path} << 'EOF'
describe('Page Component', () => {
  it('should be defined', () => {
    expect(require('../page').default).toBeDefined();
  });
});
export default {};
EOF
`);
    }
  }
  
  return scripts.join('\n');
}

// Main execution
console.log('🔍 Analyzing test files...\n');

const testFiles = findTestFiles('src');
console.log(`Found ${testFiles.length} test files\n`);

// Analyze each file
testFiles.forEach(file => analyzeTestFile(file));

// Generate report
console.log('📊 Test Analysis Report\n');
console.log('='.repeat(80));

console.log(`\n🖥️  Server Components (${categories.serverComponents.length} files)`);
console.log('These need refactoring to extract business logic:\n');
categories.serverComponents.forEach(f => {
  const status = f.hasRenderCalls ? '❌' : '✅';
  console.log(`${status} ${f.path}`);
  console.log(`   → ${f.recommendation}\n`);
});

console.log(`\n🎨 Client Components (${categories.clientComponents.length} files)`);
console.log('These can use React Testing Library:\n');
categories.clientComponents.forEach(f => {
  const status = f.importsReactTestingLibrary ? '✅' : '⚠️';
  console.log(`${status} ${f.path}`);
  console.log(`   → ${f.recommendation}\n`);
});

console.log(`\n🔌 API Routes (${categories.apiRoutes.length} files)`);
console.log('Test with mocked requests:\n');
categories.apiRoutes.forEach(f => {
  console.log(`📡 ${f.path}`);
  console.log(`   → ${f.recommendation}\n`);
});

console.log(`\n🛠️  Utilities (${categories.utilities.length} files)`);
console.log('Pure function tests:\n');
categories.utilities.forEach(f => {
  console.log(`🔧 ${f.path}`);
  console.log(`   → ${f.recommendation}\n`);
});

// Generate migration scripts
console.log('\n📝 Migration Scripts\n');
console.log('='.repeat(80));

const needsRefactoring = categories.serverComponents.filter(f => f.hasRenderCalls);
if (needsRefactoring.length > 0) {
  console.log(`\n# Refactor ${needsRefactoring.length} server component tests:`);
  console.log('# Save this as refactor-tests.sh and run with: bash refactor-tests.sh\n');
  console.log('#!/bin/bash');
  console.log(generateMigrationScript('serverComponent', needsRefactoring));
}

// Summary
console.log('\n📈 Summary\n');
console.log('='.repeat(80));
console.log(`Total test files: ${testFiles.length}`);
console.log(`Server components needing refactor: ${needsRefactoring.length}`);
console.log(`Client components ready for RTL: ${categories.clientComponents.filter(f => !f.importsReactTestingLibrary).length}`);
console.log(`API routes to test: ${categories.apiRoutes.length}`);

// Next steps
console.log('\n🚀 Next Steps:\n');
console.log('1. Run the migration script to update server component tests');
console.log('2. Extract business logic from server components');
console.log('3. Add React Testing Library to client component tests');
console.log('4. Implement API route tests with mocked dependencies');
console.log('5. Set up Playwright for E2E testing');

// Testing strategy
console.log('\n💡 Recommended Test Distribution:');
console.log('- 60% Unit tests (logic, utilities, calculations)');
console.log('- 25% Integration tests (API routes, data flow)');
console.log('- 15% E2E tests (critical user journeys)');

// Package.json scripts
console.log('\n📦 Add these scripts to package.json:');
console.log(`
"scripts": {
  "test:analyze": "node analyze-tests.js",
  "test:unit": "jest --testPathPattern='(lib|utils)/.*\\\\.test\\\\.(ts|tsx)$'",
  "test:components": "jest --testPathPattern='components/.*\\\\.test\\\\.tsx$'",
  "test:api": "jest --testPathPattern='api/.*\\\\.test\\\\.ts$'",
  "test:e2e": "playwright test"
}
`);