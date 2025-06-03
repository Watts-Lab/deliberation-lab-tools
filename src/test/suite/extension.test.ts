import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import { detectPromptMarkdown, detectTreatmentsYaml, diagnosticCollection, activate } from '../../extension';
import { suite, test } from 'mocha';

// helper function to close file
async function closeFileIfOpen(filePath: string) : Promise<void> {
	for (const doc of vscode.workspace.textDocuments) {
		console.log("Text document: " + doc.uri.path);
	}
    const tabs: vscode.Tab[] = vscode.window.tabGroups.all.map(tg => tg.tabs).flat();
	console.log("Tabs length: " + tabs.length);
	for (let i = 0; i < tabs.length; i++) {
		console.log("Tab " + i + ": " + tabs[i].input);
		if (tabs[i].input instanceof vscode.TabInputText) {
			console.log("Tab input uri path: " + (tabs[i].input as vscode.TabInputText).uri.path);
		}
	}
    const index = tabs.findIndex(tab => tab.input instanceof vscode.TabInputText && tab.input.uri.path === filePath);
	console.log("Index for closing file: " + index);
    if (index !== -1) {
        await vscode.window.tabGroups.close(tabs[index]);
    }
}

teardown(async () => {
  // Clean up all editors so the next test starts fresh.
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
});

suite('Markdown and .treatments.yaml file detection', () => {
	vscode.window.showInformationMessage('Start all tests.');
	console.log("Workspace folder: " + vscode.workspace.workspaceFolders?.at(0));

	// extension activates after first test case: try awaiting?

	// empty.treatments.yaml
	test('detecting empty .treatments.yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	// filter.treatments.yaml
	test('detecting .treatments.yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		console.log("document uri: " + document.uri.toString());

		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		console.log("length of diagnostics from vscode.languages: " + diagnostics.length);
		console.log("Length of diagnostics for filter: " + diagnosticCollection.get(document.uri)!!.length);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	test('not detecting .yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/filter.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});

	// allTalk.md
	test('not detecting markdown (or other different) file type', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});

	// incorrectFile.txt
	test('Wrong text file type for markdown detection', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/incorrectFile.txt');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// emptyField.md
	test('Header exists but field is empty', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/emptyField.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		// closes document
		// await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	test('Detects correct markdown format', async () => {

		// allTalk.md
		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
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
});

suite('Diagnostics detection', () => {
	test('Diagnostics are empty on correct markdown file', async () => {
		// allTalk.md

		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);

		// await new Promise(resolve => setTimeout(resolve, 500));
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		for (let i = 0; i < diagnostics.length; i++) {
			const d = diagnostics[i];
			console.log("index: " + i + " message: " + d.message + " range start line: " + d.range.start.line + " range end line: " + d.range.end.line);
		}
		console.log("Diagnostics undefined", diagnostics === undefined);
		console.log("Length of diagnostics: " + diagnostics?.length);
		console.log("Diagnostic error: " + diagnostics[0]);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics are empty on treatments yaml file with no errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);

		// await new Promise(resolve => setTimeout(resolve, 500));
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		for (let i = 0; i < diagnostics.length; i++) {
			const d = diagnostics[i];
			console.log("index: " + i + " message: " + d.message + " range start line: " + d.range.start.line + " range end line: " + d.range.end.line);
		}
		console.log("Length of diagnostics: " + diagnostics?.length);
		assert.strictEqual(diagnostics?.length, 0);
	});

	// Make more specific with testing specific diagnostics and errors
	test('Diagnostics register on opened treatments yaml file with errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);
		console.log(document.uri.path);
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		for (let i = 0; i < diagnostics.length; i++) {
			const d = diagnostics[i];
			console.log("index: " + i + " message: " + d.message + " range start line: " + d.range.start.line + " range end line: " + d.range.end.line);
		}
		const length = diagnostics?.length!!;
		console.log("Length of diagnostics: " + length);
		assert.strictEqual(length > 0, true);
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
		console.log(document.uri.path);

		// await new Promise(resolve => setTimeout(resolve, 1000));
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 3);
	});
});