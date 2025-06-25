import * as vscode from "vscode";
import { detectPromptMarkdown, detectTreatmentsYaml } from "./detectFile";
import { parseYaml } from "./parsers/parseYaml";
import { parseMarkdown } from "./parsers/parseMarkdown";
import { TelemetryReporter } from '@vscode/extension-telemetry';

// should this be named yamlDiagnostics if also using markdown?
export const diagnosticCollection = vscode.languages.createDiagnosticCollection("yamlDiagnostics");

const connectionString = "46b200b3-9d65-49d5-99de-ce36f669fd91";
export let reporter: TelemetryReporter;

// helper function to call parser on a specific document type if it is detected
async function parseDocument(document: vscode.TextDocument) {
  if (detectTreatmentsYaml(document)) {
    await parseYaml(document);
  } else if (detectPromptMarkdown(document)) {
    parseMarkdown(document);
  } else {
    // If file is not recognized as treatmentsYaml or promptMarkdown, clear diagnostics
    diagnosticCollection.set(document.uri, []);
    console.log("Length of diagnostic collection (should be 0): " + diagnosticCollection.get(document.uri)!!.length);
  }
}

// export function 
export async function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Extension activated");

  context.subscriptions.push(diagnosticCollection);
  console.log("Extension activated");

  // Register the reporter for telemetry
  reporter = new TelemetryReporter(connectionString);
  context.subscriptions.push(reporter);
  reporter.sendTelemetryEvent('extensionActivated');
  // Should be done once upon activation
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
        await parseDocument(event?.document);
      }
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
    reporter.sendTelemetryEvent('defaultTreatmentsYamlCommandExecuted');
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

}
