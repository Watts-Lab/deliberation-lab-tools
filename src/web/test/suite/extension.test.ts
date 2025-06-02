import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import { detectPromptMarkdown, detectTreatmentsYaml } from '../../extension';
import { suite, test } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { diagnosticCollection } from '../../extension';

async function waitForDiagnostics(uri: vscode.Uri, expectedLength: number, timeout = 3000): Promise<vscode.Diagnostic[]> {
	const interval = 100;
	let elapsed = 0;

	return new Promise((resolve, reject) => {
		const check = () => {
			const diagnostics = vscode.languages.getDiagnostics(uri);
			if (diagnostics.length >= expectedLength) {
				return resolve(diagnostics);
			}
			if (elapsed >= timeout) {
				return reject(new Error("Timed out waiting for diagnostics"));
			}
			elapsed += interval;
			setTimeout(check, interval);
		};
		check();
	});
}

suite('Markdown and .treatments.yaml file detection', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// emptyField.md
	test('Header exists but field is empty', async () => {

		const filePath = path.resolve('src/web/test/suite/fixtures/emptyField.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	test('Detects correct markdown format', async () => {

		// allTalk.md
		const filePath = path.resolve('src/web/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});


	// incorrectFile.txt
	test('Wrong text file type for markdown detection', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/incorrectFile.txt');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});


	// missingName.md
	test('Wrong markdown file header: name does not exist', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/missingName.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// missingType.md
	test('Wrong markdown file header: type does not exist', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/missingType.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// Currently not processed by Zod as a markdown file because dashes do not exist at beginning
	// missingStartDashes.md
	test('Wrong markdown file header: dashes do not exist at beginning', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/missingStartDashes.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// Name and type in different order 
	// differentOrder.md
	test('Correct markdown format for name and type in different order', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/differentOrder.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	// noDashes.md
	test('Incorrect markdown file formatting with no dashes', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/noDashes.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// firstSection.md
	test('Only first section exists, correct markdown format', async () => {

		const filePath = path.resolve('src/web/test/suite/fixtures/firstSection.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	// filter.treatments.yaml
	test('detecting .treatments.yaml file', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/filter.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	test('not detecting .yaml file', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/filter.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});

	test('detecting empty .treatments.yaml file', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/empty.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	// allTalk.md
	test('not detecting markdown (or other different) file type', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});
});

suite('Diagnostics detection', () => {
	test('Diagnostics are empty on correct markdown file', async () => {
		// allTalk.md

		const filePath = path.resolve('src/web/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		await new Promise(resolve => setTimeout(resolve, 500));
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 0);
	});

	test('Incorrect type in gameStage element', async () => {
		const filePath = path.resolve('src/web/test/suite/fixtures/badStage.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(document); // ensures activation

		const diagnostics = await waitForDiagnostics(document.uri, 1);
		console.log("document uri:", document.uri.toString());
		console.log("diagnostics length:", diagnostics.length);
		console.log("diagnostics:", JSON.stringify(diagnostics, null, 2));

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Invalid discriminator value. Expected one of: audio, display, image, prompt, qualtrics, separator, sharedNotepad, submitButton, survey, talkMeter, timer, video'
		);
	});
});