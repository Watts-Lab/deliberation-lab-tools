import * as vscode from 'vscode';
import { load as loadYaml, YAMLException } from "js-yaml";
import * as YAML from 'yaml';
import { diagnosticCollection } from '../extension';
import { ZodError, ZodIssue } from "zod";
import {
  treatmentFileSchema,
  TreatmentFileType,
  asyncValidateFilesToIssues,
} from "../zod-validators/validateTreatmentFile";
import { handleError, offsetToPosition } from "../errorPosition";
import { parse } from 'path';
import { off } from 'process';

// YAML validator for treatments

export function parseYaml(document: vscode.TextDocument) {
    console.log("Processing .treatments.yaml file...");
    console.log("Document URI from extension");
    console.log(document.uri.toString());
    const diagnostics: vscode.Diagnostic[] = [];

    // try {
    //     // Load YAML content using js-yaml
    //     const yamlContent = loadYaml(document.getText());
    //     console.log("YAML content loaded successfully.");
    //     console.log("YAML content:", yamlContent);
    // } catch (error) {
    //     if (error instanceof YAMLException) {
    //         console.error("YAML parsing error:", error.message);
    //         const lineText = document.lineAt(error.mark.line).text;;
    //         const range = new vscode.Range(
    //             new vscode.Position(error.mark.line, error.mark.column),
    //             new vscode.Position(error.mark.line, lineText.length)
    //         );
    //         let errorMessage = `YAML syntax error: ${error.message}`;
    //         const errorDesc = 'Check for proper indentation and formatting at line or nearby lines. Ensure array elements start with dashes (-).';

    //         const errorText = error.message.toLowerCase();
    //         if (errorText.includes('bad indentation')) {
    //             errorMessage += `\n ${errorDesc}`;
    //         }
    //         diagnostics.push(
    //             new vscode.Diagnostic(
    //                 range,
    //                 errorMessage,
    //                 vscode.DiagnosticSeverity.Error
    //             )
    //         );
    //         diagnosticCollection.set(document.uri, diagnostics);
    //         console.log("Length of diagnostics for yaml: " + diagnostics.length);
    //         console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
    //     }
    //     return;
    // }
    //Parse YAML content into AST
    let parsedData = YAML.parseDocument(document.getText(), {
        keepCstNodes: true,
        keepNodeTypes: true,
    } as any) || null;
    console.log("YAML parsed successfully.");
    console.log(parsedData.errors);

    if (parsedData.errors.length > 0) {
        console.log("YAML parsing errors found:", parsedData.errors);
        parsedData.errors.forEach((error: any) => {
            const range = new vscode.Range(
                new vscode.Position(error.linePos[0].line - 2, 0),
                new vscode.Position(error.linePos[0].line + 2, 10)
            );
            if (error.code === 'BAD_INDENT' || error.code === 'MISSING_CHAR' || 
                error.code === 'BLOCK_AS_IMPLICIT_KEY' || error.code === 'MULTILINE_IMPLICIT_KEY') {
                diagnostics.push(
                    new vscode.Diagnostic(
                        range,
                        `YAML syntax error: ${error.code} -> ${error.message}; Check for proper indentation and formatting at lines or at nearby lines. Check arrays elements have dashes (-) in front of them.`,
                        vscode.DiagnosticSeverity.Error
                    )
                );
            }
        });
        diagnosticCollection.set(document.uri, diagnostics);
        console.log("Length of diagnostics for yaml: " + diagnostics.length);
        console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
        return;
    } else if (parsedData.warnings) {
        console.log("YAML parsing warnings found:", parsedData.warnings);
        parsedData.warnings.forEach((warning: any) => {
            const range = new vscode.Range(
                offsetToPosition(warning.pos?.[0], document),
                offsetToPosition(warning.pos?.[1], document)
            );
            diagnostics.push(
                new vscode.Diagnostic(
                    range,
                    `YAML syntax warning: ${warning.code} -> ${warning.message}`,
                    vscode.DiagnosticSeverity.Warning
                )
            );
        });
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

    const missingFiles = asyncValidateFilesToIssues(
        parsedData.toJS() as TreatmentFileType
    ).then((issues: ZodIssue[]) => {
        issues.forEach((issue: ZodIssue) => {
            handleError(issue, parsedData, document, diagnostics);
        });
    });

    // Update diagnostics in VS Code
    diagnosticCollection.set(document.uri, diagnostics);
    console.log("Length of diagnostics for yaml: " + diagnostics.length);
    console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
}