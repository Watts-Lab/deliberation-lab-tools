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
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics are empty on treatments yaml file with no errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);
		await new Promise(resolve => setTimeout(resolve, 1000)); // wait 300ms
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics register on opened treatments yaml file with errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);
		await new Promise(resolve => setTimeout(resolve, 1000)); // wait 300ms
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
		await new Promise(resolve => setTimeout(resolve, 2000)); // wait 300ms
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		for (let i = 0; i < diagnostics.length; i++) {
			const d = diagnostics[i];
			console.log("index: " + i + " message: " + d.message + " range start line: " + d.range.start.line + " range end line: " + d.range.end.line);
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

	test('Incorrect type in gameStage element', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/badStage.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(document);
		await new Promise(resolve => setTimeout(resolve, 2000)); // wait 300ms
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
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 4);
		assert.match(diagnostics[0].message, /^YAML syntax error: BAD_INDENT/);
		const range = diagnostics[0].range;
		assert.ok(
		range.start.line <= 8 && 8 <= range.end.line,
		`Expected error line to be within range [${range.start.line}, ${range.end.line}]`
		);
	});

	test('Invalid Broadcast Key', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidBroadcastKey.treatments.yaml')
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "dx": String must start with 'd' followed by a nonnegative integer`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 198);
		assert.strictEqual(diagnostics[0].range.end.line, 200);
	});

	test('Invalid Comparator', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidComparator.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
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
		const filePath = path.resolve('src/test/suite/fixtures/missingDash.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 4);
		assert.match(diagnostics[0].message, /^YAML syntax error: BAD_INDENT/);
		const range = diagnostics[0].range;
		assert.ok(
		range.start.line <= 264 && 264 <= range.end.line,
		`Expected error line to be within range [${range.start.line}, ${range.end.line}]`
		);
	}
	);

	test('missing element field in game stages', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingElements.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "0": Stage must have elements field (check elementsSchema).'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 13);
		assert.strictEqual(diagnostics[0].range.end.line, 19);
	});

	test('missing survey name', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingSurveyName.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "surveyName": Required'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 183);
	});

	test('negative duration in timer', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/negativeDuration.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "duration": Number must be greater than 0'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 13);
		assert.strictEqual(diagnostics[0].range.end.line, 22);
	});

	test('name in template content has special characters', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/specialCharName.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 1);
		//error doesn't even seem to exist yet so disregard message for now
		assert.strictEqual(diagnostics[0].range.start.line, 4);
		assert.strictEqual(diagnostics[0].range.end.line, 14);
	});

	test('player count is string rather than number', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/stringNotNumber.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "playerCount": Expected number, received string'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 88);
		assert.strictEqual(diagnostics[0].range.end.line, 137);
	});

	test('broadcast field is in wrong spot', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/wrongFieldPlacement.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 3);
		assert.match(diagnostics[0].message, /^YAML syntax error: BLOCK_AS_IMPLICIT_KEY/);
		const range = diagnostics[0].range;
		assert.ok(
			range.start.line <= 125 && 125 <= range.end.line,
			`Expected error line to be within range [${range.start.line}, ${range.end.line}]`
		);
	});

	test('malformed reference in yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/malformedReference.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "reference": Invalid template content for content type 'treatment': Invalid reference type "participantInf", need to be in form of a valid reference type such as 'survey', 'submitButton', 'qualtrics', 'discussion', 'participantInfo', 'prompt', 'urlParams', 'connectionInfo', or 'browserInfo' followed by a . and name or path.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 249);
		assert.strictEqual(diagnostics[0].range.end.line, 253);
	});

	test('invalid file reference in template content', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidFileReference.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "file": File "shared/yesNo/survey.md" does not exist in the workspace.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 4);
		assert.strictEqual(diagnostics[0].range.end.line, 7);
	});
});