/**
 * Install extension locally to VSCode
 * This script finds the .vsix file and installs it using the code CLI
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Find the .vsix file
const vsixFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.vsix'));

if (vsixFiles.length === 0) {
  console.error('❌ No .vsix file found. Run "npm run package" first.');
  process.exit(1);
}

// Use the most recent .vsix file
const vsixFile = vsixFiles.sort().pop();
const vsixPath = path.join(rootDir, vsixFile);

console.log(`\n📦 Installing extension: ${vsixFile}`);

try {
  // Install the extension using VSCode CLI
  execSync(`code --install-extension "${vsixPath}" --force`, {
    stdio: 'inherit',
    cwd: rootDir
  });

  console.log('\n✅ Extension installed successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Reload VSCode window (Ctrl+Shift+P → "Developer: Reload Window")');
  console.log('   2. Click the ConsoleWatch icon in the Activity Bar');
  console.log('   3. Add the client snippet to your React/React Native app\n');
} catch (err) {
  console.error('\n❌ Installation failed:', err.message);
  console.log('\n💡 You can manually install by:');
  console.log(`   1. Open VSCode`);
  console.log(`   2. Press Ctrl+Shift+P`);
  console.log(`   3. Type "Install from VSIX"`);
  console.log(`   4. Select: ${vsixPath}\n`);
  process.exit(1);
}
