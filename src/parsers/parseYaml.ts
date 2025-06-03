import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { diagnosticCollection } from '../extension';
import { ZodError, ZodIssue } from "zod";
import {
  treatmentFileSchema,
  TreatmentFileType,
} from "../zod-validators/validateTreatmentFile";
import { handleError } from "../errorPosition";

// YAML validator for treatments

export function parseYaml(document: vscode.TextDocument) {
    console.log("Processing .treatments.yaml file...");
    console.log("Document URI from extension");
    console.log(document.uri.toString());
    const diagnostics: vscode.Diagnostic[] = [];

    // Parse YAML content into AST
    let parsedData;

    try {
        parsedData = YAML.parseDocument(document.getText(), {
            keepCstNodes: true,
            keepNodeTypes: true,
        } as any) || null;
        console.log("YAML parsed successfully.");
    } catch (error) {
        if (error instanceof Error) {
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
            diagnosticCollection.set(document.uri, diagnostics);
            console.log("Length of diagnostics for yaml: " + diagnostics.length);
            console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
        }
        parsedData = null;
        return;
    }

    // Check if the YAML document is empty
    if (
        !parsedData.contents ||
        (Array.isArray(parsedData.contents) &&
            parsedData.contents.length === 0)
    ) {
        console.log("YAML document is empty. Skipping validation.");
        diagnosticCollection.set(document.uri, diagnostics); // Clear any existing diagnostics
        return;
    }

    // Validate YAML content using Zod and TreatmentFileType
    console.log("Running Zod validation...");
    const validationResult = treatmentFileSchema.safeParse(
        parsedData.toJS() as TreatmentFileType
    );

    if (!validationResult.success) {
        console.log("Zod validation failed:", validationResult.error.issues);

        (validationResult.error as ZodError).issues.forEach(
            (issue: ZodIssue) => {
                handleError(issue, parsedData, document, diagnostics);
            }
        );
    } else {
        console.log(
            "Zod validation passed. Types are consistent with TreatmentFileType."
        );
    }

    // Update diagnostics in VS Code
    diagnosticCollection.set(document.uri, diagnostics);
    console.log("Length of diagnostics for yaml: " + diagnostics.length);
    console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
}