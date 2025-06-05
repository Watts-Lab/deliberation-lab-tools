const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const workspacePath = path.resolve(__dirname, '.');
  console.log("Workspace path: " + workspacePath);

  const [, , ...testFiles] = process.argv;
  process.env.TEST_FILES = testFiles || '';

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
