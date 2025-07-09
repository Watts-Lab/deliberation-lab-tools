import { get } from "http";
import * as vscode from "vscode";
import { getExtensionUri } from "./contextStore";
import { load as loadYaml } from "js-yaml";

// Command to create default treatments YAML file
export const defaultYaml = vscode.commands.registerCommand("deliberation-lab-tools.defaultTreatmentsYaml", async () => {
    const treatmentsYamlFileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "src", "fixtures", "defaultTreatment.treatments.yaml");
    const fileBytes = await vscode.workspace.fs.readFile(treatmentsYamlFileUri);
    const defaultYamlContent = new TextDecoder("utf-8").decode(fileBytes);
    await vscode.workspace.openTextDocument({
        language: 'treatmentsYaml',
        content: defaultYamlContent
    });
    vscode.window.showInformationMessage("Default .treatments.yaml file created");
});

// Command to create initial prompt markdown document
export const defaultMarkdown = vscode.commands.registerCommand('deliberation-lab-tools.createDefaultPromptMarkdown', async () => {
    vscode.window.showInformationMessage('Markdown document created');
    const promptMarkdownFileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "src", "fixtures", "defaultPromptMarkdown.md");
    const fileBytes = await vscode.workspace.fs.readFile(promptMarkdownFileUri);
    const defaultMarkdownContent = new TextDecoder("utf-8").decode(fileBytes);
    const doc = await vscode.workspace.openTextDocument({
        language: 'markdown',
        content: defaultMarkdownContent
    });
}
);

// Inline suggestion for treatments YAML file
export const inlineSuggestion = vscode.languages.registerInlineCompletionItemProvider(
    { language: "treatmentsYaml" },
    {
        async provideInlineCompletionItems(document, pos, ctx, token) {
            if (pos.line === 0 && pos.character === 0 && document.getText() === "") {
                const suggestionFileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, "src", "fixtures", "inlineSuggestion.treatments.yaml");
                const fileBytes = await vscode.workspace.fs.readFile(suggestionFileUri);
                const inlineSuggestionContent = new TextDecoder("utf-8").decode(fileBytes);
                const suggestion = new vscode.InlineCompletionItem(inlineSuggestionContent);
                suggestion.range = new vscode.Range(pos, pos);
                return [suggestion];
            }
            return [];
        },
    }
);

// Open Markdown preview
export const markdownPreview = vscode.commands.registerCommand('deliberation-lab-tools.openPromptPreview', () => {
    const file = vscode.window.activeTextEditor?.document;
    const { fileName: fileName, text: promptText } = getFileName(file!!);

    const panel = vscode.window.createWebviewPanel(
        'openPromptPreview',
        'Preview: ' + fileName,
        {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true
        },
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(getExtensionUri(), "dist", "views")],
        }
    );

    // URIs for CSS files and script file that will be passed into HTML content

    const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'index.js')
    );

    const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'styles.css')
    );

    const playerStylesUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'playerStyles.css')
    );

    const layoutUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'layout.css')
    );

    panel.webview.html = getWebviewContent(scriptUri, styleUri, playerStylesUri, layoutUri);

    // Passes document information into webview
    panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'ready') {

            // document text is passed in as "file"
            // Now passing in file as fileName to make compatible with a stage
            // name hardcoded as "example"
            // TODO: shared hardcoded as either "true" (creates SharedNotepad) or "false" (creates TextArea) - create an option to toggle?
            console.log("Webview sending prompt props to index.jsx", fileName);
            const props = { file: fileName, name: 'example', shared: false };
            console.log("Props in prompt from command", props);
            panel.webview.postMessage({ type: 'prompt', props: props });
        }
    });

    // Passes new document content into webview when document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
        const { fileName: fileName, text: promptText } = getFileName(event.document);
        panel.webview.postMessage({ type: 'prompt', props: { file: fileName, name: 'example', shared: false } });
    });

    // Passes new document content into webview when we switch to a new document
    vscode.window.onDidChangeActiveTextEditor((event) => {
        const file = event?.document;
        if (file?.languageId === "markdown") {
            const { fileName: fileName, text: promptText } = getFileName(file);

            panel.webview.postMessage({ type: 'prompt', props: { file: fileName, name: 'example', shared: false } });
            panel.title = 'Preview: ' + fileName;
        }
    });

    // Helper function in Prompt
    // TODO: refactor so we don't duplicate this code in Prompt preview and Stage preview
    panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'file') {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(file!!.uri);
            console.log("Workspace folder uri", workspaceFolder, workspaceFolder?.uri);
            const fileUri = vscode.Uri.joinPath(workspaceFolder!!.uri, message.file);
            console.log("File URI", fileUri);

            // Look into try-catching a Thenable
            try {
                vscode.workspace.openTextDocument(fileUri).then((doc) => {
                    console.log("Correctly extracted text", doc.getText());
                    panel.webview.postMessage({ type: 'file', fileText: doc.getText() });
                });
            } catch (e) {
                console.log("File path could not be read");
                panel.webview.postMessage({ type: 'file', fileText: null });
            }
        }
    });
});

// Open YAML preview
export const stagePreview = vscode.commands.registerCommand('deliberation-lab-tools.openStagePreview', () => {
    // maybe this file changes when we switch to a new document?
    const file = vscode.window.activeTextEditor?.document;
    const { fileName: fileName, text: promptText } = getFileName(file!!);

    const panel = vscode.window.createWebviewPanel(
        'openStagePreview',
        'Preview: ' + fileName,
        {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true
        },
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(getExtensionUri(), "dist", "views")],
        }
    );

    // URIs for CSS files and script file that will be passed into HTML content - possibly refactor?

    const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'index.js')
    );

    const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'styles.css')
    );

    const playerStylesUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'playerStyles.css')
    );

    const layoutUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(getExtensionUri(), 'dist', 'views', 'layout.css')
    );

    panel.webview.html = getWebviewContent(scriptUri, styleUri, playerStylesUri, layoutUri);

    // Passes document information into webview
    panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'ready') {

            const treatments = loadYaml(promptText);
            console.log("Treatments from load yaml", treatments);

            // document text is passed in as "file"
            // name hardcoded as "example"
            // TODO: shared hardcoded as either "true" (creates SharedNotepad) or "false" (creates TextArea) - create an option to toggle?
            panel.webview.postMessage({ type: 'stage', props: treatments });
        }
    });

    // Passes new document content into webview when document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
        const { fileName: fileName, text: promptText } = getFileName(event.document);
        const treatments = loadYaml(promptText);
        console.log("Treatments from load yaml", treatments);

        // TODO: refactor from promptProps (shouldn't be called promptProps anymore)
        panel.webview.postMessage({ type: 'stage', props: treatments });
    });

    // Passes new document content into webview when we switch to a new document
    vscode.window.onDidChangeActiveTextEditor((event) => {
        const file = event?.document;
        if (file?.languageId === "treatmentsYaml") {
            const { fileName: fileName, text: promptText } = getFileName(file);

            // only load treatments for now
            const treatments = loadYaml(promptText);
            console.log("Treatments from load yaml", treatments);

            // TODO: refactor from promptProps (shouldn't be called promptProps anymore)
            panel.webview.postMessage({ type: 'stage', props: treatments });
            panel.title = 'Preview: ' + fileName;
        }
    });

    // Helper to pass file text back - could possibly refactor into another method?
    // TODO: add handling for workspace folder
    panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'file') {
            console.log("In helper to process file text");
            console.log("Is file passing?", file, file!!.uri);
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(file!!.uri);
            console.log("Workspace folder uri", workspaceFolder, workspaceFolder?.uri);
            const fileUri = vscode.Uri.joinPath(workspaceFolder!!.uri, message.file);
            console.log("File URI", fileUri);

            // Look into try-catching a Thenable
            try {
                vscode.workspace.openTextDocument(fileUri).then((doc) => {
                    console.log("Correctly extracted text", doc.getText());
                    panel.webview.postMessage({ type: 'file', fileText: doc.getText() });
                });
            } catch (e) {
                console.log("File path could not be read");
                panel.webview.postMessage({ type: 'file', fileText: null });
            }
        }
    });
});

// Returns object with fileName field and promptText field
function getFileName(file: vscode.TextDocument) {
    const text = file.getText();

    // Sets file name to relative path from the workspace folder
    // Maybe TODO: put into helper method to avoid duplicating code?
    let fileName = file.uri.toString();
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(file.uri);
    if (workspaceFolder) {
        fileName = vscode.workspace.asRelativePath(file.uri);
    }

    console.log("File name", fileName);

    return { fileName, text };
}

function openFile() {

}

// Loads HTML content for the webview
function getWebviewContent(scriptUri: vscode.Uri, styleUri: vscode.Uri, playerStylesUri: vscode.Uri, layoutUri: vscode.Uri) {

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en" class="light">
        <head>
        <meta charset="UTF-8" />
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="stylesheet" href="${styleUri}" />
        <link rel="stylesheet" href="${playerStylesUri}" />
        <link rel="stylesheet" href="${layoutUri}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Deliberation Lab</title>
        <style>
            :root {
            color-scheme: light;
            --vscode-editor-background: white;
            --vscode-foreground: black;
            --vscode-textPreformat-foreground: black;
            --vscode-textPreformat-background: white;
            }

            html {
            --vscode-textPreformat-foreground: black;
            --vscode-textPreformat-background: white;
            }

            body {
            background-color: white !important;
            color: black !important;
            }

            code {
            background-color: white !important;
            color: black !important;
            }
        </style>
        </head>
        <body>
        <div id="root"></div>
        <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
        </body>
    </html>`;
};

// Nonce for security
function getNonce(): string {
    let text: string = "";
    const possible: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}