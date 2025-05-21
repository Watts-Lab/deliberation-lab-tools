import * as assert from 'assert';
import { detectPromptMarkdown } from '../../extension';


// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Testing different file type', () => {
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

		// 1️⃣ create an untitled markdown document pre-filled with `content`
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content                          // 👈 put the text here
		});

		// 2️⃣ run the assertion
		assert.strictEqual(detectPromptMarkdown(doc), true);
	});


	test('wrong file type', async () => {
		const content = "Dont work";
		const doc = await vscode.workspace.openTextDocument({
			language: 'text',
			content                          // 👈 put the text here
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
			content                          // 👈 put the text here
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
			content                          // 👈 put the text here
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
			content                          // 👈 put the text here
		});

		assert.strictEqual(detectPromptMarkdown(doc), false);
	});
});
