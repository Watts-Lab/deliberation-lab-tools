import * as vscode from "vscode";
import { detectPromptMarkdown, detectTreatmentsYaml, detectdlConfig, detectBatchConfig } from "./detectFile";
import { parseYaml } from "./parsers/parseYaml";
import { parseMarkdown } from "./parsers/parseMarkdown";
import { parseDlConfig } from "./parsers/parseDlConfig";
import { parseBatchConfig } from "./parsers/parseBatchConfig";
import { defaultMarkdown, inlineSuggestion, defaultYaml, markdownPreview } from "./commands";
import { setExtensionContext } from "./contextStore";
import { FileFixCodeActionProvider } from "./codeActionProvider";

// should this be named yamlDiagnostics if also using markdown?
export const diagnosticCollection = vscode.languages.createDiagnosticCollection("yamlDiagnostics");


// helper function to call parser on a specific document type if it is detected
async function parseDocument(document: vscode.TextDocument) {
  if (detectTreatmentsYaml(document)) {
    await parseYaml(document);
  } else if (detectPromptMarkdown(document)) {
    parseMarkdown(document);
  } else if (detectdlConfig(document)) {
    await parseDlConfig(document);
  } else if (await detectBatchConfig(document)) {
    parseBatchConfig(document);
  } else {
    // If file is not recognized as treatmentsYaml or promptMarkdown, clear diagnostics
    diagnosticCollection.set(document.uri, []);
  }
}

// export function 
export async function activate(context: vscode.ExtensionContext) {
  setExtensionContext(context);
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
    }),

    // When we switch to a document open in another tab
    vscode.window.onDidChangeActiveTextEditor(async (event) => {
      if (event?.document !== undefined) {
        parseDocument(event?.document);
      }
    })
  );

  vscode.languages.registerCodeActionsProvider('treatmentsYaml', new FileFixCodeActionProvider(), {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
  });

  // Command to create default treatments YAML file
  context.subscriptions.push(defaultYaml);

  // Command to create initial prompt markdown document
  context.subscriptions.push(defaultMarkdown);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document && editor.document.getText() === "" && editor.document.languageId === "treatmentsYaml") {
        const position = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(position, position);
        context.subscriptions.push(inlineSuggestion);
        await new Promise((res) => setTimeout(res, 50));
        await vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
      }
    })
  );

  // Open Markdown preview
  context.subscriptions.push(markdownPreview);
}
