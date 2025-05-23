const { runTests } = require('@vscode/test-web');
const path = require('path');

async function main() {
  console.log(__dirname);
  try {
    await runTests({
      browserType: 'chromium',
      version: 'insiders', // or 'stable'
      extensionDevelopmentPath: path.resolve(__dirname, '.'),
      extensionPath: path.resolve(__dirname, '../dist'), // Bundled extension
      extensionTestsPath: path.resolve(__dirname, '../dist/web/test/suite/extensionTests.js'), // Bundled tests
      launchArgs: [path.resolve(__dirname, '../')], // Workspace folder
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
