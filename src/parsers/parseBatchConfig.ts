import * as vscode from "vscode";
import { z, ZodIssue, ZodError } from "zod";
import { batchConfigSchema, BatchConfigType } from "../zod-validators/validateBatchConfig";
import { diagnosticCollection } from "../extension";
import { handleError, offsetToPosition } from "../errorPosition";

const parseAST = require('json-to-ast');

const settings = {
    loc: true,
    source: 'data.json'
};

export function parseBatchConfig(document: vscode.TextDocument) {
    // console.log("Processing batchconfig.json file...");
    const diagnostics: vscode.Diagnostic[] = [];

    try {
        const fileContent = document.getText();
        const json = JSON.parse(fileContent);
        const parsedData = parseAST(fileContent, settings);
        const result = batchConfigSchema.safeParse(json as BatchConfigType);
        if (!result.success) {
            // console.error("Validation failed for batchconfig.json:", result);
            result.error.issues.forEach((issue: ZodIssue) => {
                handleError(issue, parsedData, document, diagnostics);
            });
        } else {
            // console.log("batchconfig.json validated successfully.");
        }

        // Additional validation can be added here as needed

    } catch (error) {
        diagnostics.push(new vscode.Diagnostic(
            new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)),
            `Error parsing batchconfig.json: ${error instanceof Error ? error.message : String(error)}`,
            vscode.DiagnosticSeverity.Error
        ));
    }

    diagnosticCollection.set(document.uri, diagnostics);
}