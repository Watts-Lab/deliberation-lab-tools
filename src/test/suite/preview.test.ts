import { Workbench, EditorView, WebView, By, withTagName } from 'vscode-extension-tester';
import * as assert from 'assert';
import { suite, test, before, it, after } from 'mocha';

// Uses vscode-extension-tester library to test that webview populates

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

        it('Prompt preview loaded', async function () {
            const element = await view.findWebElement(By.css('title'));
            assert.strictEqual((await element.getText()), "Deliberation Lab");
        });

		it('Specific class on prompt preview', async function () {
			const element = await view.findWebElement(By.className('max-w-xl'));
			assert.ok(element.isDisplayed());
		});
	});

	test('Prompt preview with error', function () {
		let view: WebView;

		before(async function () {
			this.timeout(8000);

            await new EditorView().openEditor('src/test/suite/fixtures/emptyField.md');
			await new Workbench().executeCommand('deliberation-lab-tools.openPromptPreview');
			await new Promise((res) => {
				setTimeout(res, 1_000);
			});
			view = new WebView();
			await view.switchToFrame(5_000);
		});

        it('Prompt preview loaded', async function () {
            const element = await view.findWebElement(By.css('title'));
            assert.strictEqual((await element.getText()), "Deliberation Lab");
        });

		it('Prompt preview displays errors', async function () {
			const element = await view.findWebElement(By.xpath("//a[@role = 'alert']"));
			assert.ok(element.isDisplayed());
		});
	});

	test('Stage preview', function () {
		let view: WebView;

		before(async function () {
			this.timeout(8000);

            await new EditorView().openEditor('src/test/suite/fixtures/validTreatment.treatments.yaml');
			await new Workbench().executeCommand('deliberation-lab-tools.openStagePreview');
			await new Promise((res) => {
				setTimeout(res, 1_000);
			});
			view = new WebView();
			await view.switchToFrame(5_000);
		});

        it('Stage preview loaded', async function () {
            const element = await view.findWebElement(By.css('title'));
            assert.strictEqual((await element.getText()), "Deliberation Lab");
        });

		it('StageFrame class on Stage preview', async function () {
			const element = await view.findWebElement(By.className('stage-frame'));
			assert.ok(element.isDisplayed());
		});
	});

	test('Stage preview with error', function () {
		let view: WebView;

		before(async function () {
			this.timeout(8000);

            await new EditorView().openEditor('src/test/suite/fixtures/invalidBroadcastKey.treatments.yaml');
			await new Workbench().executeCommand('deliberation-lab-tools.openStagePreview');
			await new Promise((res) => {
				setTimeout(res, 1_000);
			});
			view = new WebView();
			await view.switchToFrame(5_000);
		});

        it('Stage preview loaded', async function () {
            const element = await view.findWebElement(By.css('title'));
            assert.strictEqual((await element.getText()), "Deliberation Lab");
        });

		it('Stage preview displays errors', async function () {
			const element = await view.findWebElement(By.xpath("//a[@role = 'alert']"));
			assert.ok(element.isDisplayed());
		});
	});
});