#!/usr/bin/env node
/**
 * This script injects the built index.html content into the worker file
 * before deployment to avoid hardcoding asset filenames.
 */

const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, '../functions/_worker.ts');
const indexHtmlPath = path.join(__dirname, '../dist/index.html');

try {
  // Read the worker file
  let workerContent = fs.readFileSync(workerPath, 'utf8');
  
  // Read the index.html file
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Escape the HTML content for JavaScript string
  const escapedHtml = indexHtml
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  
  // Replace the placeholder with the actual content
  workerContent = workerContent.replace(
    "const INDEX_HTML_PLACEHOLDER = '__INDEX_HTML_CONTENT__';",
    `const INDEX_HTML_PLACEHOLDER = \`${escapedHtml}\`;`
  );
  
  // Write back to the worker file
  fs.writeFileSync(workerPath, workerContent, 'utf8');
  
  console.log('✓ Successfully injected index.html into worker');
} catch (error) {
  console.error('✗ Error injecting index.html:', error.message);
  process.exit(1);
}
