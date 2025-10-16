import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import { suite, test } from 'mocha';

suite('Diagnostics detection', () => {

	test('Diagnostics are empty on correct markdown file', async () => {
		// allTalk.md

		const filePath = path.resolve('src/test/suite/fixtures/allTalk.md');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics are empty on treatments yaml file with no errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/empty.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000)); 
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics?.length, 0);
	});

	test('Diagnostics register on opened treatments yaml file with errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/filter.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		// Tests that there are 4 error messages as we expect
		assert.strictEqual(diagnostics.length, 4);

		// Each diagnostic should have a message "Error in item "elements": Array must contain at least 1 element(s) if we want to test for messages as well

		// Tests that each diagnostic error is located on the line that we expect (range is its location)
		assert.strictEqual(diagnostics[0].range.start.line, 6);
		assert.strictEqual(diagnostics[0].range.end.line, 6);

		assert.strictEqual(diagnostics[1].range.start.line, 9);
		assert.strictEqual(diagnostics[1].range.end.line, 9);

		assert.strictEqual(diagnostics[2].range.start.line, 15);
		assert.strictEqual(diagnostics[2].range.end.line, 15);

		assert.strictEqual(diagnostics[3].range.start.line, 18);
		assert.strictEqual(diagnostics[3].range.end.line, 18);
	});

	// emptyField.md
	// 1. invalid number of --- separators
	// 2. type is empty, should be enum
	// 3. no prompt text
	// make more specific to test for specific errors
	test('Diagnostics register on opened markdown file with errors', async () => {

		const filePath = path.resolve('src/test/suite/fixtures/emptyField.md');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000)); // wait 300ms
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		for (let i = 0; i < diagnostics.length; i++) {
			const d = diagnostics[i];
		}

		// Tests that there are 4 errors/warnings
		assert.strictEqual(diagnostics.length, 4);

		// First error should be on first line for invalid number of separators
		assert.strictEqual(diagnostics[0].range.start.line, 0);
		assert.strictEqual(diagnostics[0].range.end.line, 0);
		assert.strictEqual(diagnostics[0].message, "Invalid number of separators, should be 3");

		// Second error should be encompassing first metadata section, reporting that file name does not match
		assert.strictEqual(diagnostics[1].range.start.line, 0);
		assert.strictEqual(diagnostics[1].range.end.line, 2);
		assert.strictEqual(diagnostics[1].message, "Error in item \"name\": name must match file path starting from repository root");

		// Third error should be encompassing the first metadata section (from start of separator to type line), reporting that type is null
		assert.strictEqual(diagnostics[2].range.start.line, 0);
		assert.strictEqual(diagnostics[2].range.end.line, 2);
		assert.strictEqual(diagnostics[2].message, "Error in item \"type\": Expected 'openResponse' | 'multipleChoice' | 'noResponse' | 'listSorter', received null");

		// Fourth error should be on separator for prompt text, reporting that prompt text must exist
		assert.strictEqual(diagnostics[3].range.start.line, 3);
		assert.strictEqual(diagnostics[3].range.end.line, 3);
		assert.strictEqual(diagnostics[3].message, "Prompt text must exist");
	});

	test('Incorrect type in gameStage element', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/badStage.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(document);
		await new Promise(resolve => setTimeout(resolve, 3000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "type": Invalid discriminator value. Expected 'audio' | 'display' | 'image' | 'prompt' | 'qualtrics' | 'separator' | 'sharedNotepad' | 'submitButton' | 'survey' | 'talkMeter' | 'timer' | 'video'`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 58);
		assert.strictEqual(diagnostics[0].range.end.line, 60);
	});

	test('Indentation error in TemplateContent', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/brokenIndentation.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(document);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		assert.strictEqual(diagnostics.length, 4);
		assert.match(diagnostics[0].message, /^YAML syntax error: BAD_INDENT/);
		const range = diagnostics[0].range;
		assert.ok(
		range.start.line <= 8 && 8 <= range.end.line,
		`Expected error line to be within range [${range.start.line}, ${range.end.line}]`
		);
	});

	test('Invalid Broadcast Key', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidBroadcastKey.treatments.yaml')
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 2000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "dx": String must start with 'd' followed by a nonnegative integer`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 203);
		assert.strictEqual(diagnostics[0].range.end.line, 205);
	});

	test('Invalid Comparator', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidComparator.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "comparator": Invalid discriminator value. Expected 'exists' | 'doesNotExist' | 'equals' | 'doesNotEqual' | 'isAbove' | 'isBelow' | 'isAtLeast' | 'isAtMost' | 'hasLengthAtLeast' | 'hasLengthAtMost' | 'includes' | 'doesNotInclude' | 'matches' | 'doesNotMatch' | 'isOneOf' | 'isNotOneOf'`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 110);
		assert.strictEqual(diagnostics[0].range.end.line, 113);
	});

	test('Missing dash', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingDash.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 4);
		assert.match(diagnostics[0].message, /^YAML syntax error: BAD_INDENT/);
		const range = diagnostics[0].range;
		assert.ok(
		range.start.line <= 264 && 264 <= range.end.line,
		`Expected error line to be within range [${range.start.line}, ${range.end.line}]`
		);
	}
	);

	test('missing element field in game stages', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingElements.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "0": Stage must have elements field (check elementsSchema).'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 15);
		assert.strictEqual(diagnostics[0].range.end.line, 21);
	});

	test('missing survey name', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/missingSurveyName.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "surveyName": Required'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 135);
	});

	test('negative duration in timer', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/negativeDuration.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);

		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "duration": Number must be greater than 0'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 15);
		assert.strictEqual(diagnostics[0].range.end.line, 24);
	});

	test('name in template content has special characters', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/specialCharName.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		//error doesn't even seem to exist yet so disregard message for now
		assert.strictEqual(diagnostics[0].range.start.line, 4);
		assert.strictEqual(diagnostics[0].range.end.line, 14);
	});

	test('player count is string rather than number', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/stringNotNumber.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			'Error in item "playerCount": Expected number, received string'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 88);
		assert.strictEqual(diagnostics[0].range.end.line, 139);
	});

	test('broadcast field is in wrong spot', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/wrongFieldPlacement.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 3);
		assert.match(diagnostics[0].message, /^YAML syntax error: BLOCK_AS_IMPLICIT_KEY/);
		const range = diagnostics[0].range;
		assert.ok(
			range.start.line <= 125 && 125 <= range.end.line,
			`Expected error line to be within range [${range.start.line}, ${range.end.line}]`
		);
	});

	test('malformed reference in yaml file', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/malformedReference.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "reference": Invalid template content for content type 'treatment': Invalid reference type "participantInf", need to be in form of a valid reference type such as 'survey', 'submitButton', 'qualtrics', 'discussion', 'participantInfo', 'prompt', 'urlParams', 'connectionInfo', or 'browserInfo' followed by a . and name or path.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 256);
		assert.strictEqual(diagnostics[0].range.end.line, 260);
	});

	test('invalid file reference in template content', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidFileReference.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "file": File "shared/yesNo/survey.md" does not exist in the workspace. Make sure "shared/yesNo/survey.md" is located in and is written relative to "file:///Users/gmo/deliberation-lab-tools/src/test/suite/fixtures"`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 4);
		assert.strictEqual(diagnostics[0].range.end.line, 8);
	});

	test('dlconfig.json exists and whole file path given', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/dlConfig.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "file": File "src/test/suite/fixtures/dlConfig.treatments.yaml" does not exist in the workspace. Make sure "src/test/suite/fixtures/dlConfig.treatments.yaml" is located in and is written relative to "file:///Users/gmo/deliberation-lab-tools/src/test/suite/fixtures"`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 4);
		assert.strictEqual(diagnostics[0].range.end.line, 8);
	});

	test('position is higher than player count', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/highPosition.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 2);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "position": Invalid template content for content type 'treatment': Player position index 2 in groupComposition exceeds playerCount of 2.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 9);
		assert.strictEqual(diagnostics[0].range.end.line, 14);
	});

	test('array of positions has elements higher than playerCount', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/arrayOfPositions.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 2);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "1": Invalid template content for content type 'treatment': showToPositions index 2 in stage "Strategies and Filler" exceeds playerCount of 2.`
		);
		assert.strictEqual(
			diagnostics[1].message,
			`Error in item "1": Invalid template content for content type 'treatment': hideFromPositions index 3 in stage "Strategies and Filler" exceeds playerCount of 2.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 26);
		assert.strictEqual(diagnostics[0].range.end.line, 26);
		assert.strictEqual(diagnostics[1].range.start.line, 29);
		assert.strictEqual(diagnostics[1].range.end.line, 29);
	});

	//wrongFieldName.config.json
	test('wrong field name in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/wrongFieldName.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 2);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "batchName": Required`
		);
		assert.strictEqual(
			diagnostics[1].message,
			`Error in item "undefined": Unrecognized key(s) in object: 'batchNam'`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 0);
		assert.strictEqual(diagnostics[0].range.end.line, 0);
		assert.strictEqual(diagnostics[1].range.start.line, 0);
		assert.strictEqual(diagnostics[1].range.end.line, 42);
	});

	//wrongValue.config.json
	test('wrong value in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/wrongValue.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "batchName": Expected string, received number`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 1);
		assert.strictEqual(diagnostics[0].range.end.line, 1);
	});

	//invalidValueSyntax.config.json
	test('invalid treatment yaml fileName syntax in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidValueSyntax.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "treatmentFile": Invalid`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 3);
		assert.strictEqual(diagnostics[0].range.end.line, 3);
	});

	// payoffsNegativeNumber.config.json
	test('negative number in payoffs array', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/payoffsNegativeNumber.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "0": Number must be greater than 0`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 6);
		assert.strictEqual(diagnostics[0].range.end.line, 6);
	});

	// invalidEnum.config.json
	test('invalid enum value in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/invalidEnum.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "cdn": Invalid enum value. Expected 'test' | 'prod' | 'local', received 'poo'`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 2);
		assert.strictEqual(diagnostics[0].range.end.line, 2);
	});

	// payoffsLengthNotEqual.config.json
	test('payoffs length not equal to treatments length in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/payoffsLengthNotEqual.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "payoffs": Number of payoffs must match number of treatments, or be set to "equal"`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 6);
		assert.strictEqual(diagnostics[0].range.end.line, 6);
	});

	//knockdownsLengthNotEqual.config.json
	test('knockdowns length not equal to treatments length in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/knockdownsNotSameTreatments.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 2);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "knockdowns": Number of rows in knockdown matrix must match number of treatments`
		);
		assert.strictEqual(diagnostics[1].message,
			'Error in item "knockdowns": Knockdown matrix row 1 must match number of treatments'
		);
		assert.strictEqual(diagnostics[0].range.start.line, 7);
		assert.strictEqual(diagnostics[0].range.end.line, 10);
		assert.strictEqual(diagnostics[1].range.start.line, 7);
		assert.strictEqual(diagnostics[1].range.end.line, 10);

	});

	//videoAudioCheck.config.json
	test('audio false while video true in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/videoAudioDifferent.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "checkAudio": Cannot check video without also checking audio`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 40);
		assert.strictEqual(diagnostics[0].range.end.line, 40);
	});

	// exitCodesObj.config.json
	test('exitCodes has invalid subfield in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/exitCodesObj.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "exitCodes": Invalid input`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 12);
		assert.strictEqual(diagnostics[0].range.end.line, 17);
	});

	// pastDate.config.json
	test('past date in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/pastDate.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "launchDate": Launch date must be in the future. If you do not wish to use a launch date, enter value "immediate"`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 18);
		assert.strictEqual(diagnostics[0].range.end.line, 18);
	});

	// badRegex.config.json
	test('bad regex in batch config', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/badRegex.config.json');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "customIdInstructions": Keys must be valid URL parameters (alphanumeric, underscores, or hyphens) or "default"`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 19);
		assert.strictEqual(diagnostics[0].range.end.line, 22);
	});

	//sharedNotIntro.treatments.yaml
	test('sharedNotIntro treatment with shared field in intro element', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/sharedNotIntro.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 1);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "shared": Prompt element in intro/exit steps cannot be shared.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 187);
		assert.strictEqual(diagnostics[0].range.end.line, 190);
	});

	//positionNotIntro.treatments.yaml
	test('positionNotIntro treatment with position field in intro element', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/positionNotIntro.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 3);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "0": Elements in intro steps cannot have a 'showToPositions' field.`
		);
		assert.strictEqual(
			diagnostics[1].message,
			`Error in item "0": Elements in intro steps cannot have a 'hideFromPositions' field.`
		);
		assert.strictEqual(
			diagnostics[2].message,
			`Error in item "position": Elements in intro steps cannot have a 'position' field.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 187);
		assert.strictEqual(diagnostics[0].range.end.line, 192);
		assert.strictEqual(diagnostics[1].range.start.line, 187);
		assert.strictEqual(diagnostics[1].range.end.line, 192);
		assert.strictEqual(diagnostics[2].range.start.line, 193);
		assert.strictEqual(diagnostics[2].range.end.line, 196);
	});

	//groupCompositionLength.treatments.yaml
	test('groupCompositionLength treatment with groupComposition length not equal to playerCount', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/groupCompositionLength.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 3);
		assert.strictEqual(
			diagnostics[0].message,
			`Error in item "groupComposition": Invalid template content for content type 'treatment': groupComposition length 3 exceeds playerCount of 2.`
		);
		assert.strictEqual(
			diagnostics[1].message,
			`Error in item "groupComposition": Invalid template content for content type 'treatment': Player positions in groupComposition must be unique.`
		);
		assert.strictEqual(
			diagnostics[2].message,
			`Error in item "groupComposition": Invalid template content for content type 'treatment': Player positions in groupComposition must include all nonnegative integers below playerCount (2). Missing: 1.`
		);
	});

	//referenceChecks.treatments.yaml
	test('referenceChecks treatment with various invalid references', async () => {
		const filePath = path.resolve('src/test/suite/fixtures/referenceChecks.treatments.yaml');
		const document = await vscode.workspace.openTextDocument(filePath);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		assert.strictEqual(diagnostics.length, 2);
		assert.strictEqual(
			diagnostics[0].message,
			`Reference "survey.real.done" appears before its survey "real" is initialized (init stage 7, found at stage 6).`
		);
		assert.strictEqual(
			diagnostics[1].message,
			`Reference "connectionInfo.fake" does not match any defined connectionInfo element name.`
		);
		assert.strictEqual(diagnostics[0].range.start.line, 132);
		assert.strictEqual(diagnostics[0].range.end.line, 135);
		assert.strictEqual(diagnostics[1].range.start.line, 130);
		assert.strictEqual(diagnostics[1].range.end.line, 130);
	});
});