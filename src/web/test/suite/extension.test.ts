import * as assert from 'assert';
import { detectPromptMarkdown, detectTreatmentsYaml } from '../../extension';


// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Testing different file type for markdown', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Checking correct filetype', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `---
name: projects/example/allTalk.md
type: noResponse
---

Please describe the chair you are sitting in.

Everybody talk at once. Sometimes take pauses.

---
		`;

		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content               
		});

		assert.strictEqual(detectPromptMarkdown(doc), true);
	});


	test('wrong file type', async () => {
		const content = "Dont work";
		const doc = await vscode.workspace.openTextDocument({
			language: 'text',
			content                          
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	test('wrong file header: name does not exist', async () => {
		const content = `---
noName: projects/example/allTalk.md
type: noResponse
---

Please describe the chair you are sitting in.

Everybody talk at once. Sometimes take pauses.

---
		`;
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content                          
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	test('wrong file header: type does not exist', async () => {
		const content = `---
name: projects/example/allTalk.md
: noResponse
---

Please describe the chair you are sitting in.

Everybody talk at once. Sometimes take pauses.

---
		`;
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content                          
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	test('wrong file header: dashes do not exist', async () => {
		const content = `
name: projects/example/allTalk.md
: noResponse
---

Please describe the chair you are sitting in.

Everybody talk at once. Sometimes take pauses.

---
		`;
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content                          
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	test('detecting .treatments.yaml file', async () => {
		const content = `
treatments:
  - name: treatment_one
    playerCount: 1
    gameStages:
      - name: Role Assignment and General Instructions
        duration: 300
        elements: []
      - name: Main Discussion
        duration: 200
        elements: []
  - name: treatment_two
    playerCount: 1
    gameStages:
      - name: test
        duration: 200
        elements: []
      - name: test2
        duration: 200
        elements: []
		`;
		const doc = await vscode.workspace.openTextDocument({
			language: 'treatmentsYaml',
			content                          
		});

		assert.strictEqual(detectTreatmentsYaml(doc), true);
	})

	test('not detecting .yaml file', async () => {
		const content = `
treatments:
  - name: treatment_one
    playerCount: 1
    gameStages:
      - name: Role Assignment and General Instructions
        duration: 300
        elements: []
      - name: Main Discussion
        duration: 200
        elements: []
  - name: treatment_two
    playerCount: 1
    gameStages:
      - name: test
        duration: 200
        elements: []
      - name: test2
        duration: 200
        elements: []
		`;
		const doc = await vscode.workspace.openTextDocument({
			language: 'yaml',
			content                          
		});
		assert.strictEqual(detectTreatmentsYaml(doc), false);
	})

	test('detecting empty .treatments.yaml file', async () => {
		const content = ``;
		const doc = await vscode.workspace.openTextDocument({
			language: 'treatmentsYaml',
			content
		});

		assert.strictEqual(detectTreatmentsYaml(doc), true);
	})

	test('not detecting markdown (or other different) file type', async () => {
		const content = ``;
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content                          
		});

		assert.strictEqual(detectTreatmentsYaml(doc), false);
	})
});
