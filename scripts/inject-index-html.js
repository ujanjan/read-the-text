#!/usr/bin/env node
/**
 * This script injects the built index.html content into a COPY of the worker file
 * before deployment to avoid hardcoding asset filenames in the source.
 * 
 * Source: functions/_worker.ts (contains placeholder)
 * Output: dist/_worker.ts (contains actual HTML, used by wrangler)
 * 
 * Also copies the entire functions directory structure to dist/functions
 * so relative imports work correctly.
 */

const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, '../functions');
const distFunctionsDir = path.join(__dirname, '../dist/functions');
const workerOutputPath = path.join(__dirname, '../dist/_worker.ts');
const indexHtmlPath = path.join(__dirname, '../dist/index.html');

// Recursively copy directory
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Copy entire functions directory to dist/functions
  copyDir(functionsDir, distFunctionsDir);
  console.log('✓ Copied functions/ to dist/functions/');
  
  // Read the copied worker file
  const workerSourcePath = path.join(distFunctionsDir, '_worker.ts');
  let workerContent = fs.readFileSync(workerSourcePath, 'utf8');
  
  // Read the built index.html file
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Escape the HTML content for JavaScript string
  const escapedHtml = indexHtml
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  
  // Replace the placeholder with the actual content
  const placeholder = "const INDEX_HTML_PLACEHOLDER = '__INDEX_HTML_CONTENT__';";
  
  if (!workerContent.includes(placeholder)) {
    console.error('✗ Error: Placeholder not found in worker source file');
    console.error('  Make sure functions/_worker.ts contains:');
    console.error(`  ${placeholder}`);
    process.exit(1);
  }
  
  workerContent = workerContent.replace(
    placeholder,
    `const INDEX_HTML_PLACEHOLDER = \`${escapedHtml}\`;`
  );
  
  // Write the modified worker back to dist/functions/_worker.ts
  fs.writeFileSync(workerSourcePath, workerContent, 'utf8');
  
  console.log('✓ Successfully injected index.html into dist/functions/_worker.ts');
} catch (error) {
  console.error('✗ Error injecting index.html:', error.message);
  process.exit(1);
}
