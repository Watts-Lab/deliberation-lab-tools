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

	test('Diagnostics are empty on treatments yaml file with no errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);

		await new Promise(resolve => setTimeout(resolve, 500));
		
		const diagnostics = diagnosticCollection.get(document.uri);
		console.log("Length of diagnostics: " + diagnostics?.length);
		assert.strictEqual(diagnostics?.length, 0);
	});

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