<<<<<<< HEAD
import * as assert from 'assert';
import { detectPromptMarkdown, detectTreatmentsYaml } from '../../extension';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { diagnosticCollection } from '../../extension';

const path = require('path');

suite('Markdown and .treatments.yaml file detection', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// Tests are currently done by creating text documents - will need to debug file path

	test('Detects correct markdown format for prompt', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `---
name: mock-prompt-files/prompt.md
type: 
---
		`;

		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content               
		});

		assert.strictEqual(detectPromptMarkdown(doc), true);
	});

	test('Detects correct markdown format', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		// allTalk.md
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


	// incorrectFile.txt
	test('Wrong text file type for markdown detection', async () => {
		const content = "Dont work";
		const doc = await vscode.workspace.openTextDocument({
			language: 'text',
			content                          
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});


	// missingName.md
	test('Wrong markdown file header: name does not exist', async () => {
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

	// missingType.md
	test('Wrong markdown file header: type does not exist', async () => {
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

	// Should this file be processed as wrong or just not processed at all?
	// Currently not processed by Zod at all
	test('Wrong markdown file header: dashes do not exist at beginning', async () => {
		const content = `
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

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	// Name and type in different order
	test('Correct markdown format for name and type in different order', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `---
type: noResponse
name: projects/example/allTalk.md
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

	// Add test for markdown file with no dashes in the file at all
	test('Incorrect markdown file formatting with no dashes', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `type: noResponse
name: projects/example/allTalk.md

Please describe the chair you are sitting in.

Everybody talk at once. Sometimes take pauses.
		`;

		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content               
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	test('Correct markdown format but missing other sections (dashes)', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `---
type: noResponse
name: projects/example/allTalk.md
		`;

		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content               
		});

		assert.strictEqual(detectPromptMarkdown(doc), true);
	});



	// filter.treatments.yaml
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

	// allTalk.md
	test('not detecting markdown (or other different) file type', async () => {
		const content = ``;
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content                          
		});

		assert.strictEqual(detectTreatmentsYaml(doc), false);
	})
});

suite('Diagnostics detection', () => {
	test('Diagnostics are empty on correct markdown file', async () => {
		// allTalk.md

		const filePath = path.resolve('fixtures/allTalk.md');
		console.log(filePath);
		const document = await vscode.workspace.openTextDocument(filePath);

		await new Promise(resolve => setTimeout(resolve, 500));
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 0);
	});
});
=======
import * as assert from 'assert';
import { detectPromptMarkdown, detectTreatmentsYaml } from '../../extension';


// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Markdown and .treatments.yaml file detection', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// Tests are currently done by creating text documents - will need to debug file path

	test('Detects correct markdown format for prompt', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `---
name: mock-prompt-files/prompt.md
type: 
---
		`;

		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content               
		});

		assert.strictEqual(detectPromptMarkdown(doc), true);
	});

	test('Detects correct markdown format', async () => {
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


	test('Wrong text file type for markdown detection', async () => {
		const content = "Dont work";
		const doc = await vscode.workspace.openTextDocument({
			language: 'text',
			content                          
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	test('Wrong markdown file header: name does not exist', async () => {
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

	test('Wrong markdown file header: type does not exist', async () => {
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

	// Should this file be processed as wrong or just not processed at all?
	// Currently not processed by Zod at all
	test('Wrong markdown file header: dashes do not exist at beginning', async () => {
		const content = `
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

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	// Name and type in different order
	test('Correct markdown format for name and type in different order', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `---
type: noResponse
name: projects/example/allTalk.md
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

	// Add test for markdown file with no dashes in the file at all
	test('Incorrect markdown file formatting with no dashes', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `type: noResponse
name: projects/example/allTalk.md

Please describe the chair you are sitting in.

Everybody talk at once. Sometimes take pauses.
		`;

		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content               
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});

	test('Correct markdown format but missing other sections (dashes)', async () => {
		// const uri = vscode.Uri.file(
		// 	path.resolve(__dirname, 'src/web/test/suite/allTalk.md'));
		// const document = await vscode.workspace.openTextDocument(uri);

		const content = `---
type: noResponse
name: projects/example/allTalk.md
		`;

		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content               
		});

		assert.strictEqual(detectPromptMarkdown(doc), true);
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
>>>>>>> markdown-validator
