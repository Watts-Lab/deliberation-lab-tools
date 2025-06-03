import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import { detectPromptMarkdown, detectTreatmentsYaml } from '../../extension';
import { suite, test } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { diagnosticCollection } from '../../extension';


suite('Markdown and .treatments.yaml file detection', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// emptyField.md
	test('Header exists but field is empty', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/emptyField.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	test('Detects correct markdown format', async () => {

		// allTalk.md
		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});


	// incorrectFile.txt
	test('Wrong text file type for markdown detection', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/incorrectFile.txt');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});


	// missingName.md
	test('Wrong markdown file header: name does not exist', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingName.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// missingType.md
	test('Wrong markdown file header: type does not exist', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingType.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// Currently not processed by Zod as a markdown file because dashes do not exist at beginning
	// missingStartDashes.md
	test('Wrong markdown file header: dashes do not exist at beginning', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingStartDashes.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// Name and type in different order 
	// differentOrder.md
	test('Correct markdown format for name and type in different order', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/differentOrder.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	// noDashes.md
	test('Incorrect markdown file formatting with no dashes', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/noDashes.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// firstSection.md
	test('Only first section exists, correct markdown format', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/firstSection.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	// filter.treatments.yaml
	test('detecting .treatments.yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	test('not detecting .yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/filter.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});

	test('detecting empty .treatments.yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	// allTalk.md
	test('not detecting markdown (or other different) file type', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});
});

suite('Diagnostics detection', () => {
	test('Diagnostics are empty on correct markdown file', async () => {
		// allTalk.md

		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);

		await new Promise(resolve => setTimeout(resolve, 500));
		
		// const diagnostics = vscode.languages.getDiagnostics(document.uri);
		
		const diagnostics = diagnosticCollection.get(document.uri);
		console.log("Diagnostics undefined", diagnostics === undefined);
		console.log("Length of diagnostics: " + diagnostics?.length);
		assert.strictEqual(diagnostics?.length, 0);
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

		assert.strictEqual(diagnostics.length, 2);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "0": Closest schema match: Elements. Expected string, received object`
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
		//error doesn't even seem to exist yet so disregard message for now
		assert.strictEqual(diagnostics[0].range.start.line, 12);
		assert.strictEqual(diagnostics[0].range.end.line, 19);
	});

	test('missing survey name', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingSurveyName.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "surveyName": Required'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 6);
		assert.strictEqual(diagnostics[0].range.end.line, 7);
	});

	test('negative duration in timer', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/negativeDuration.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
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
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());

		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 1);
		//error doesn't even seem to exist yet so disregard message for now
		assert.strictEqual(diagnostics[0].range.start.line, 3);
		assert.strictEqual(diagnostics[0].range.end.line, 15);
	});

	test('player count is string rather than number', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/stringNotNumber.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "playerCount": Expected number, received string'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 17);
		assert.strictEqual(diagnostics[0].range.end.line, 25);
	});

	test('broadcast field is in wrong spot', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/wrongFieldPlacement.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 2);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "broadcast": Expected object, received string'
		);
		assert.strictEqual(
			diagnostics[1].message,
			'Error in item "broadcast": Required'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 125);
		assert.strictEqual(diagnostics[0].range.end.line, 149);
	});

	test('malformed reference in yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/malformedReference.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "reference": Closest schema match: Treatment. Expected string, received null'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 278);
		assert.strictEqual(diagnostics[0].range.end.line, 281);
	});

	// test('Diagnostics are empty on treatments yaml file with no errors', async () => {

	// 	const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
	// 	console.log(filePath);
	// 	const document = await vscode.workspace.openTextDocument(filePath);
	// 	console.log(document.uri.path);

	// 	await new Promise(resolve => setTimeout(resolve, 500));
		
	// 	const diagnostics = diagnosticCollection.get(document.uri);
	// 	console.log("Length of diagnostics: " + diagnostics?.length);
	// 	assert.strictEqual(diagnostics?.length, 0);
	// });

	// test('Diagnostics register on opened treatments yaml file with errors', async () => {

	// 	const filePath = path.resolve('src/web/test/suite/fixtures/filter.treatments.yaml');
	// 	console.log(filePath);
	// 	const document = await vscode.workspace.openTextDocument(filePath);
	// 	console.log(document.uri.path);

	// 	await new Promise(resolve => setTimeout(resolve, 500));
		
	// 	const diagnostics = diagnosticCollection.get(document.uri);
	// 	const length = diagnostics?.length!!;
	// 	console.log("Length of diagnostics: " + length);
	// 	assert.strictEqual(length > 0, true);
	// });

	// // emptyField.md: type is empty, should be enum (will throw error)
	// test('Diagnostics register on opened markdown file with errors', async () => {
	// 	// const extension = vscode.extensions.getExtension('undefined_publisher.deliberation-lab-tools');
	// 	// console.log("Loading extension");
	// 	// assert.ok(extension);
	// 	// console.log("Activating extension");
	// 	// await extension?.activate();
	// 	// assert.ok(extension!.isActive);

	// 	const filePath = path.resolve('src/web/test/suite/fixtures/emptyField.md');
	// 	console.log(filePath);
	// 	const document = await vscode.workspace.openTextDocument(filePath);
	// 	console.log(document.uri.path);

	// 	await new Promise(resolve => setTimeout(resolve, 500));
		
	// 	const diagnostics = diagnosticCollection.get(document.uri);
	// 	const length = diagnostics?.length!!;
	// 	console.log("Length of diagnostics: " + length);
	// 	assert.strictEqual(length > 0, true);
	// });
});