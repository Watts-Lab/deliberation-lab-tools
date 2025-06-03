import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import { suite, test } from 'mocha';

suite('Diagnostics detection', () => {
	test('Diagnostics are empty on correct markdown file', async () => {
		// allTalk.md

		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics are empty on treatments yaml file with no errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics register on opened treatments yaml file with errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);
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
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		for (let i = 0; i < diagnostics.length; i++) {
			const d = diagnostics[i];
			console.log("index: " + i + " message: " + d.message + " range start line: " + d.range.start.line + " range end line: " + d.range.end.line);
		}

		// Tests that there are 3 errors/warnings
		assert.strictEqual(diagnostics.length, 3);

		// First error should be on first line for invalid number of separators
		assert.strictEqual(diagnostics[0].range.start.line, 0);
		assert.strictEqual(diagnostics[0].range.end.line, 0);
		assert.strictEqual(diagnostics[0].message, "Invalid number of separators, should be 3");

		// Second error should be encompassing the first metadata section (from start of separator to type line), reporting that type is null
		assert.strictEqual(diagnostics[1].range.start.line, 0);
		assert.strictEqual(diagnostics[1].range.end.line, 2);
		assert.strictEqual(diagnostics[1].message, "Error in item \"type\": Expected 'openResponse' | 'multipleChoice' | 'noResponse' | 'listSorter', received null");

		// Third error should be on separator for prompt text, reporting that prompt text must exist
		assert.strictEqual(diagnostics[2].range.start.line, 3);
		assert.strictEqual(diagnostics[2].range.end.line, 3);
		assert.strictEqual(diagnostics[2].message, "Prompt text must exist");
	});

    test('Incorrect type in gameStage element', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/badStage.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(document);

		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "type": Invalid discriminator value. Expected 'audio' | 'display' | 'image' | 'prompt' | 'qualtrics' | 'separator' | 'sharedNotepad' | 'submitButton' | 'survey' | 'talkMeter' | 'timer' | 'video'`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 52);
		assert.strictEqual(diagnostics[0].range.end.line, 54);
	});

	test('Indentation error in TemplateContent', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/brokenIndentation.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(document);

		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "TemplateContent": Expected indentation of 4 spaces but found 2'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 7);
		assert.strictEqual(diagnostics[0].range.end.line, 16);
	});

	test('Invalid Broadcast Key', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidBroadcastKey.treatments.yaml')
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "dx": String must start with 'd' followed by a nonnegative integer`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 197);
		assert.strictEqual(diagnostics[0].range.end.line, 199);
	});

	test('Invalid Comparator', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidComparator.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "comparator": Invalid discriminator value. Expected 'exists' | 'doesNotExist' | 'equals' | 'doesNotEqual' | 'isAbove' | 'isBelow' | 'isAtLeast' | 'isAtMost' | 'hasLengthAtLeast' | 'hasLengthAtMost' | 'includes' | 'doesNotInclude' | 'matches' | 'doesNotMatch' | 'isOneOf' | 'isNotOneOf'`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 104);
		assert.strictEqual(diagnostics[0].range.end.line, 107);
	});

	test('Missing dash', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingDashes.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "introSteps": Expected array, received object'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 261);
		assert.strictEqual(diagnostics[0].range.end.line, 266);
	}
	);

	test('missing element field in game stages', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingElementField.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(diagnostics[0].range.start.line, 12);
		assert.strictEqual(diagnostics[0].range.end.line, 19);
	});
});