import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 3000
  });

  const testsRoot = path.resolve(__dirname);

  let files;

  if (process.env.TEST_FILES) {

    // environment variable TEST_FILES automatically converts array to string and separates elements by commas, so we split elements here
    const testFiles = process.env.TEST_FILES?.split(',') ?? [];
    files = testFiles;
  } else {
    files = await glob('**/*.test.js', { cwd: testsRoot });
  }

  for (const file of files) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures: number) => {
        failures > 0
          ? reject(new Error(`${failures} test(s) failed.`))
          : resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}
