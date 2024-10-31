import * as vscode from "vscode";
import YAML from "yaml";
import { topSchema } from "../zod-validators/validateTreatmentFile";
import { ZodError } from "zod";

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Extension activated");
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("yamlDiagnostics");
  context.subscriptions.push(diagnosticCollection);

  // Listen for changes in YAML files
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === "treatmentsYaml") {
        console.log("Processing .treatments.yaml file...");
        const diagnostics: vscode.Diagnostic[] = [];

        // Parse the YAML content
        let parsedData;
        try {
          parsedData = YAML.parse(event.document.getText());
        } catch (error) {
          if (error instanceof Error) {
            // Type-check error as an instance of Error
            const range = new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 1)
            );
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `YAML syntax error: ${error.message}`,
                vscode.DiagnosticSeverity.Error
              )
            );
            diagnosticCollection.set(event.document.uri, diagnostics);
          }
          return;
        }

        // Run Zod validation on parsed YAML using topSchema
        const validationResult = topSchema.safeParse(parsedData);
        if (!validationResult.success) {
          console.log("Zod validation failed:", validationResult.error.issues);
          (validationResult.error as ZodError).issues.forEach((issue) => {
            // Create diagnostics for each validation error
            const range = new vscode.Range(
              new vscode.Position(0, 0), // Adjust this range based on YAML content if possible
              new vscode.Position(0, 1)
            );
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `Validation error: ${issue.message}`,
                vscode.DiagnosticSeverity.Warning
              )
            );
          });
        }

        // Update diagnostics in VS Code
        diagnosticCollection.set(event.document.uri, diagnostics);
      }
    })
  );
}
