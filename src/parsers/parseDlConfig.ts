import * as vscode from "vscode";
import { z, ZodIssue, ZodError } from "zod";
import { dlConfigSchema, DlConfigType } from "../zod-validators/validateDlConfig";
import { diagnosticCollection } from "../extension";
import { handleError, offsetToPosition } from "../errorPosition";

const parseAST = require('json-to-ast');

const settings = {
  loc: true,
  source: 'data.json'
};


export async function parseDlConfig(document: vscode.TextDocument) {
    // console.log("Processing dlconfig.json file...");
    const diagnostics: vscode.Diagnostic[] = [];

    try {
        const fileContent = document.getText();
        const json = JSON.parse(fileContent);
        const parsedData = parseAST(fileContent, settings);

        // Validate the JSON structure
        if (!json.experimentRoot && json.experimentRoot !== "") {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)),
                "Missing 'experimentRoot' in dlconfig.json",
                vscode.DiagnosticSeverity.Error
            ));
        } else {
           const result =  await dlConfigSchema.safeParseAsync(json as DlConfigType);
            if (!result.success) {
                // console.error("Validation failed for dlconfig.json:", result);
                result.error.issues.forEach((issue: ZodIssue) => {
                    handleError(issue, parsedData, document, diagnostics);
                });
            } else {
                // console.log("dlconfig.json validated successfully.");
            }
        }

        // Additional validation can be added here as needed

    } catch (error) {
        diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)),
            `Error parsing dlconfig.json: ${error instanceof Error ? error.message : String(error)}`,
            vscode.DiagnosticSeverity.Error
        ));
    }

    diagnosticCollection.set(document.uri, diagnostics);
}