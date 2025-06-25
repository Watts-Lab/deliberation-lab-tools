import { Workbench, EditorView, WebView, By } from 'vscode-extension-tester';
import * as assert from 'assert';
import { suite, test, before, it } from 'mocha';

suite('Preview', function () {
	test('Open prompt preview from markdown document', function () {
		let view: WebView;

		before(async function () {
			this.timeout(8000);

            await new EditorView().openEditor('src/test/suite/fixtures/allTalk.md');
			await new Workbench().executeCommand('deliberation-lab-tools.openPromptPreview');
			await new Promise((res) => {
				setTimeout(res, 1_000);
			});
			view = new WebView();
			await view.switchToFrame(5_000);
		});

        it('findWebElement works', async function () {
            const element = await view.findWebElement(By.css('title'));
            assert.strictEqual((await element.getText()), "Deliberation Lab");
        })
	});
});