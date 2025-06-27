const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const workspacePath = path.resolve(__dirname, '.');

  const [, , ...testFiles] = process.argv;
  process.env.TEST_FILES = testFiles || '';

  // Added argument '--disable-extensions' to prevent other extensions from interfering with the tests
  // Temporarily shuts other extensions off to ensure a clean test environment
  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '.'),
      extensionTestsPath: path.resolve(__dirname, './out/test/suite/index.js'),
      launchArgs: [
        workspacePath,
        '--disable-extensions'
      ]
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
