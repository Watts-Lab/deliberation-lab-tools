import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import { suite, test } from 'mocha';

suite('Diagnostics detection', () => {
	test('Diagnostics are empty on correct markdown file', async () => {
		// allTalk.md

		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		const document = await vscode.workspace.openTextDocument(filePath);
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics are empty on treatments yaml file with no errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics register on opened treatments yaml file with errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		// Tests that there are 4 error messages as we expect
		assert.strictEqual(diagnostics.length, 4);

		// Each diagnostic should have a message "Error in item "elements": Array must contain at least 1 element(s) if we want to test for messages as well

		// Tests that each diagnostic error is located on the line that we expect (range is its location)
		assert.strictEqual(diagnostics[0].range.start.line, 6); 
		assert.strictEqual(diagnostics[0].range.end.line, 6); 

		assert.strictEqual(diagnostics[1].range.start.line, 9); 
		assert.strictEqual(diagnostics[1].range.end.line, 9); 

		assert.strictEqual(diagnostics[2].range.start.line, 15); 
		assert.strictEqual(diagnostics[2].range.end.line, 15); 

		assert.strictEqual(diagnostics[3].range.start.line, 18); 
		assert.strictEqual(diagnostics[3].range.end.line, 18); 
	});

	// emptyField.md
	// 1. invalid number of --- separators
	// 2. type is empty, should be enum
	// 3. no prompt text
	// make more specific to test for specific errors
	test('Diagnostics register on opened markdown file with errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/emptyField.md');
		const document = await vscode.workspace.openTextDocument(filePath);
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		for (let i = 0; i < diagnostics.length; i++) {
			const d = diagnostics[i];
		}

		// Tests that there are 4 errors/warnings
		assert.strictEqual(diagnostics.length, 4);

		// First error should be on first line for invalid number of separators
		assert.strictEqual(diagnostics[0].range.start.line, 0);
		assert.strictEqual(diagnostics[0].range.end.line, 0);
		assert.strictEqual(diagnostics[0].message, "Invalid number of separators, should be 3");

        // Second error should be encompassing first metadata section, reporting that file name does not match
        assert.strictEqual(diagnostics[1].range.start.line, 0);
		assert.strictEqual(diagnostics[1].range.end.line, 2);
		assert.strictEqual(diagnostics[1].message, "Error in item \"name\": name must match file path starting from repository root");

		// Third error should be encompassing the first metadata section (from start of separator to type line), reporting that type is null
		assert.strictEqual(diagnostics[2].range.start.line, 0);
		assert.strictEqual(diagnostics[2].range.end.line, 2);
		assert.strictEqual(diagnostics[2].message, "Error in item \"type\": Expected 'openResponse' | 'multipleChoice' | 'noResponse' | 'listSorter', received null");

		// Fourth error should be on separator for prompt text, reporting that prompt text must exist
		assert.strictEqual(diagnostics[3].range.start.line, 3);
		assert.strictEqual(diagnostics[3].range.end.line, 3);
		assert.strictEqual(diagnostics[3].message, "Prompt text must exist");
	});
});