/**
 * Clean script - removes dist folder and .vsix files for fresh build
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Directories and patterns to clean
const toClean = [
  'dist',
];

// Clean .vsix files
const vsixFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.vsix'));

console.log('🧹 Cleaning build artifacts...');

// Remove directories
toClean.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`   Removed: ${dir}/`);
  }
});

// Remove .vsix files
vsixFiles.forEach(file => {
  const fullPath = path.join(rootDir, file);
  fs.rmSync(fullPath, { force: true });
  console.log(`   Removed: ${file}`);
});

console.log('✅ Clean complete!\n');
