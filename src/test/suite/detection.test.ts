import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
// changed from extension to detectFile
import { detectdlConfig, detectPromptMarkdown, detectTreatmentsYaml, detectBatchConfig } from '../../detectFile';
import { suite, test } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import { diagnosticCollection } from '../../extension';


suite('Markdown and .treatments.yaml file detection', () => {
	vscode.window.showInformationMessage('Start all tests.');
	console.log("Workspace folder: " + vscode.workspace.workspaceFolders?.at(0));

	// extension activates after first test case: try awaiting?

	// empty.treatments.yaml
	test('detecting empty .treatments.yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	// filter.treatments.yaml
	test('detecting .treatments.yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), true);
	});

	test('not detecting .yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/filter.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});

	// allTalk.md
	test('not detecting markdown (or other different) file type', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectTreatmentsYaml(document), false);
	});

	// incorrectFile.txt
	test('Wrong text file type for markdown detection', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/incorrectFile.txt');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// emptyField.md
	test('Header exists but field is empty', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/emptyField.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	test('Detects correct markdown format', async () => {

		// allTalk.md
		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});


	// missingName.md
	test('Wrong markdown file header: name does not exist', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingName.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// missingType.md
	test('Wrong markdown file header: type does not exist', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingType.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// Currently not processed by Zod as a markdown file because dashes do not exist at beginning
	// missingStartDashes.md
	test('Wrong markdown file header: dashes do not exist at beginning', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingStartDashes.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// Name and type in different order 
	// differentOrder.md
	test('Correct markdown format for name and type in different order', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/differentOrder.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	// noDashes.md
	test('Incorrect markdown file formatting with no dashes', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/noDashes.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), false);
	});

	// firstSection.md
	test('Only first section exists, correct markdown format', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/firstSection.md');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectPromptMarkdown(document), true);
	});

	//dlconfig.json
	test('Detecting dlconfig.json', async () => {
		const filePath = path.resolve('dlconfig.json');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectdlConfig(document), true);
	});

	//package.json
	test('Detecting file that is not named dlconfig.json', async () => {
		const filePath = path.resolve('package.json');
		const document = await vscode.workspace.openTextDocument(filePath);

		assert.strictEqual(detectdlConfig(document), false);
	})

	//test.config.json
	test('Detecting batch config file in experimentRoot file path', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/test.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		const result = await detectBatchConfig(document);

		assert.strictEqual(result, true);
	})

	//wrongPath.config.json
	test('Detecting batch config file not in experimentRoot file path', async () => {
		const filePath = path.resolve('src/fixtures/wrongPath.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		const result = await detectBatchConfig(document);

		assert.strictEqual(result, false);
	})

	//allTalk.md
	test('Trying to detect batch config file in experimentRoot file path that doesnt end with .config.json', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		const document = await vscode.workspace.openTextDocument(filePath);
		const result = await detectBatchConfig(document);

		assert.strictEqual(result, false);
	})
});