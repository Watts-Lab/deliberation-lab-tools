import { get } from "http";
import * as vscode from "vscode";
import { getExtensionUri } from "./contextStore";

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
    const promptText = vscode.window.activeTextEditor?.document.getText();
    const file = vscode.window.activeTextEditor?.document;

    const panel = vscode.window.createWebviewPanel(
        'openPromptPreview',
        'Prompt Preview',
        vscode.ViewColumn.Beside,
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
          // name hardcoded as "example"
          // TODO: shared hardcoded as either "true" (creates SharedNotepad) or "false" (creates TextArea) - create an option to toggle?
          panel.webview.postMessage({ type: 'init', promptProps: { file: promptText, name: 'example', shared: false } });
        }
    });

      // Passes new document content into webview when document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
        const promptText = event.document.getText();
        panel.webview.postMessage({ type: 'init', promptProps: { file: promptText, name: 'example', shared: false } });
    });
    }
);

// Loads HTML content for the webview
export function getWebviewContent(scriptUri: vscode.Uri, styleUri: vscode.Uri, playerStylesUri: vscode.Uri, layoutUri: vscode.Uri) {

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
export function getNonce(): string {
    let text: string = "";
    const possible: string =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}