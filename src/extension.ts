import * as vscode from "vscode";
import { detectPromptMarkdown, detectTreatmentsYaml } from "./detectFile";
import { parseYaml } from "./parsers/parseYaml";
import { parseMarkdown } from "./parsers/parseMarkdown";

// should this be named yamlDiagnostics if also using markdown?
export const diagnosticCollection = vscode.languages.createDiagnosticCollection("yamlDiagnostics");


// helper function to call parser on a specific document type if it is detected
async function parseDocument(document: vscode.TextDocument) {
  if (detectTreatmentsYaml(document)) {
    await parseYaml(document);
  } else if (detectPromptMarkdown(document)) {
    parseMarkdown(document);
  } else {
    // If file is not recognized as treatmentsYaml or promptMarkdown, clear diagnostics
    diagnosticCollection.set(document.uri, []);
  }
}

// export function 
export async function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Extension activated");

  context.subscriptions.push(diagnosticCollection);
  console.log("Extension activated");

  // Should be done once upon activation (if a document is open)
  if (vscode.window.activeTextEditor && vscode.window.activeTextEditor?.document) {
    await parseDocument(vscode.window.activeTextEditor?.document!!);
  }

  // Listen for when a document is opened
  context.subscriptions.push(

    // for opening document
    vscode.workspace.onDidOpenTextDocument(async (event) => {
      if (event !== undefined) {
        await parseDocument(event);
      }
    }),

    // for changing document
    vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event?.document !== undefined) {
          parseDocument(event?.document);
        };
      })
    );

  const defaultYaml = vscode.commands.registerCommand("deliberation-lab-tools.defaultTreatmentsYaml", async () => {
    const defaultYamlContent = `introSequences:
  - name: "exampleIntro"
    introSteps:
      - name: "exampleStep1"
        elements:
          - type: "prompt"
            
treatments:
  - name: "exampleTreatment"
    playerCount: 1
    gameStages:
      - name: "exampleStage1"
        duration: 60
        elements:
          - type: "prompt"`;
    await vscode.workspace.openTextDocument({
      language: 'treatmentsYaml',
      content: defaultYamlContent
    });
    vscode.window.showInformationMessage("Default .treatments.yaml file created");
  });
  context.subscriptions.push(defaultYaml);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document && editor.document.getText() === "" && editor.document.languageId === "treatmentsYaml") {
        const position = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(position, position);
        const controller = vscode.languages.registerInlineCompletionItemProvider(
          { language: "treatmentsYaml" },
          {
            provideInlineCompletionItems(document, pos, ctx, token) {
              if (pos.line === 0 && pos.character === 0 && document.getText() === "") {
                const suggestion = new vscode.InlineCompletionItem(`# Click tab to fill with template
introSequences:
  - name: "exampleIntro"
    introSteps:
      - name: "exampleStep1"
        elements:
          - type: "prompt"
            
treatments:
  - name: "exampleTreatment"
    playerCount: 1
    gameStages:
      - name: "exampleStage1"
        duration: 60
        elements:
          - type: "prompt"`);
                suggestion.range = new vscode.Range(pos, pos);
                return [suggestion];
              }
              return [];
            },
          }
        );
        context.subscriptions.push(controller);
        await new Promise((res) => setTimeout(res, 50));
        await vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
      }
    })
  )

  // Open Markdown preview
  context.subscriptions.push(
    vscode.commands.registerCommand('deliberation-lab-tools.openPromptPreview', () => {
      const promptText = vscode.window.activeTextEditor?.document.getText();
      const file = vscode.window.activeTextEditor?.document;

      const panel = vscode.window.createWebviewPanel(
        'openPromptPreview',
        'Prompt Preview',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist", "views")],
        }
      );

      // URIs for CSS files and script file that will be passed into HTML content

      const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'index.js')
      );

      const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'styles.css')
      );

      const playerStylesUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'playerStyles.css')
      );

      const layoutUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'layout.css')
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
    })
  );

  // Command to create initial prompt markdown document
  context.subscriptions.push(
    vscode.commands.registerCommand('deliberation-lab-tools.createDefaultPromptMarkdown', async () => {
      vscode.window.showInformationMessage('Markdown document created');

      const content = `---
name:
type: 
---
Fill in prompt text here.
---
Fill in response text here.
		`;

      const doc = await vscode.workspace.openTextDocument({
        language: 'markdown',
        content
      });
    }
    )
  );
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
}

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