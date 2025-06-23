import * as vscode from "vscode";
import { detectPromptMarkdown, detectTreatmentsYaml } from "./detectFile";
import { parseYaml } from "./parsers/parseYaml";
import { parseMarkdown } from "./parsers/parseMarkdown";
import * as path from "path";
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
// import Prompt from 'render/prompt';

// should this be named yamlDiagnostics if also using markdown?
export const diagnosticCollection = vscode.languages.createDiagnosticCollection("yamlDiagnostics");

// helper function to call parser on a specific document type if it is detected
function parseDocument(document: vscode.TextDocument) {
  if (detectTreatmentsYaml(document)) {
    parseYaml(document);
  } else if (detectPromptMarkdown(document)) {
    parseMarkdown(document);
  } else {
    // If file is not recognized as treatmentsYaml or promptMarkdown, clear diagnostics
    diagnosticCollection.set(document.uri, []);
    console.log("Length of diagnostic collection (should be 0): " + diagnosticCollection.get(document.uri)!!.length);
  }
}

// export function 
export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Extension activated");
  context.subscriptions.push(diagnosticCollection);
  console.log("Extension activated");

  // Should be done once upon activation (if a document is open)
  if (vscode.window.activeTextEditor && vscode.window.activeTextEditor?.document) {
    parseDocument(vscode.window.activeTextEditor?.document!!);
  }

  // Listen for when a document is opened
  context.subscriptions.push(

    // for opening document
    vscode.workspace.onDidOpenTextDocument((event) => {
      if (event !== undefined) {
        parseDocument(event);
      }
    }),

    // for changing document
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event?.document !== undefined) {
        parseDocument(event?.document);
      };
    })
  );

  // Open Markdown preview
  // In researcher-portal, mocks.js creates HTML content
  // RenderPanel.tsx, Timeline.tsx
  context.subscriptions.push(
    vscode.commands.registerCommand('deliberation-lab-tools.openPromptPreview', () => {
      // registers before panel is created - is there a way to get this text editor while the webview is open
      const promptText = vscode.window.activeTextEditor?.document.getText();
      const file = vscode.window.activeTextEditor?.document;
      console.log("Document text before webview", promptText);
      console.log("Document before webview", file);

      const panel = vscode.window.createWebviewPanel(
        'openPromptPreview',
        'Prompt Preview',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist", "views")],
        }
      );

      console.log("Webview created");
      console.log("Extension URI: " + context.extensionUri);
      console.log("Extension path?" + context.extensionPath);
      console.log("Local resource root: " + vscode.Uri.joinPath(context.extensionUri, "dist", "views"));

      const scriptUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'index.js')
      );
      console.log("Script URI: " + scriptUri);

      const styleUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'styles.css')
      );
      console.log("Style URI: " + styleUri);

      const playerStylesUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'playerStyles.css')
      );
      console.log("Player Styles URI: " + playerStylesUri);

      const layoutUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'views', 'layout.css')
      );
      console.log("Layout URI: " + layoutUri);

      panel.webview.html = getWebviewContent(scriptUri, styleUri, playerStylesUri, layoutUri);
      panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'ready') {
          console.log('Webview is ready, sending prompt props');
          console.log("Text document text", promptText);

          // name hardcoded as "example"
          // shared hardcoded as either "true" (creates SharedNotepad) or "false" (creates TextArea)
          panel.webview.postMessage({ type: 'init', promptProps: { file: promptText, name: 'example', shared: false } });
        }
      });
    })
  );

  // Command to create initial prompt markdown document
  context.subscriptions.push(
    vscode.commands.registerCommand('deliberation-lab-tools.initialPromptMarkdown', async () => {
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
  console.log("In webview content");
  console.log("Dirname: " + __dirname);

  console.log("Script URI in webview content: " + scriptUri.toString());

  const nonce = getNonce();
  // const html = renderToStaticMarkup(Prompt(vscode.window.activeTextEditor?.document, vscode.window.activeTextEditor?.document.fileName));
  // return html;

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
      <script>
        console.log("In HTML generation");
      </script>
    </body>
  </html>`;

  // Default text to make sure that webview content can be generated
  // return `<!DOCTYPE html>
  //  <html>
  //   <body>
  //     <h1>Hello from Webview</h1>
  //     <script>
  //       console.log("Webview JS working!");
  //     </script>
  //   </body>
  // </html>`;
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