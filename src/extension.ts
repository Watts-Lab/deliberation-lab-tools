import * as vscode from "vscode";
import { detectPromptMarkdown, detectTreatmentsYaml } from "./detectFile";
import { parseYaml } from "./parsers/parseYaml";
import { parseMarkdown } from "./parsers/parseMarkdown";

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
  
  const defaultYaml = vscode.commands.registerCommand("deliberation-lab-tools.defaultTreatmentsYaml", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document && editor.document.languageId === "treatmentsYaml") {
      const defaultYamlContent = `introSequences:
  - name: "exampleIntro"
    introSteps:
      - name: "exampleStep1"
        elements:
          - exampleElement1

treatments:
  - name: "exampleTreatment"
    playerCount: 1
    gameStages:
      - name: "exampleStage1"
        duration: 60
        elements:
          - exampleElement2`
      editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, defaultYamlContent);
      });
    }
  });
  context.subscriptions.push(defaultYaml);

  context.subscriptions.push(diagnosticCollection);
  console.log("Extension activated");

  // Should be done once upon activation
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
      }
    })
  );
}
