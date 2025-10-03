import * as vscode from 'vscode';
import { load as loadYaml, YAMLException } from "js-yaml";
import * as YAML from 'yaml';
import { diagnosticCollection } from '../extension';
import { z, ZodError, ZodIssue } from "zod";
import {
    treatmentFileSchema,
    TreatmentFileType,
} from "../zod-validators/validateTreatmentFile";
import { handleError, offsetToPosition, findPositionFromPath } from "../errorPosition";
import { parse } from 'path';
import { off } from 'process';

// YAML validator for treatments

export async function parseYaml(document: vscode.TextDocument) {
    // console.log("Processing .treatments.yaml file...");
    const diagnostics: vscode.Diagnostic[] = [];

    //Parse YAML content into AST
    let parsedData = YAML.parseDocument(document.getText(), {
        keepCstNodes: true,
        keepNodeTypes: true,
    } as any) || null;
    // console.log("YAML parsed successfully.");
    // console.log(parsedData.errors);

    if (parsedData.errors.length > 0) {
        // console.log("YAML parsing errors found:", parsedData.errors);
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
        // console.log("Length of diagnostics for yaml: " + diagnostics.length);
        // console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
        return;
    } else if (parsedData.warnings) {
        // console.log("YAML parsing warnings found:", parsedData.warnings);
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
        // console.log("YAML document is empty. Skipping validation.");
        diagnosticCollection.set(document.uri, diagnostics); // Clear any existing diagnostics
        return;
    }

    // Validate YAML content using Zod and TreatmentFileType
    // console.log("Running Zod validation...");
    const validationResult = treatmentFileSchema.safeParse(
        parsedData.toJS() as TreatmentFileType
    );


    if (!validationResult.success) {
        // console.log("Zod validation failed:", validationResult.error.issues);
        (validationResult.error as ZodError).issues.forEach(
            (issue: ZodIssue) => {
                handleError(issue, parsedData, document, diagnostics);
            }
        );
    } else {
        //     console.log(
        //         "Zod validation passed. Types are consistent with TreatmentFileType."
        //     );
    }

    async function existence(parentUri: vscode.Uri, uri: vscode.Uri): Promise<{ uri: vscode.Uri; exists: boolean }> {
        try {
            await vscode.workspace.fs.stat(uri);
            return {
                uri: uri,
                exists: true
            };
        } catch (err) {
            if ((err as any).code === 'FileNotFound' || (err as any).name === 'EntryNotFound') {
                return {
                    uri: parentUri,
                    exists: false
                };
            }
            throw err;
        }
    }
    async function fileExistsInWorkspace(relativePath: string): Promise<{ uri: vscode.Uri; exists: boolean }> {
        try {
            const fileConfigUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'dlconfig.json');
            // console.log("Checking if dlconfig.json exists in workspace");
            await vscode.workspace.fs.stat(fileConfigUri);
            const fileData = await vscode.workspace.fs.readFile(fileConfigUri);
            const fileContent = new TextDecoder('utf-8').decode(fileData);
            const json = JSON.parse(fileContent);
            let fileUri: vscode.Uri;
            if (json?.experimentRoot && json.experimentRoot !== "") {
                const fileParentUri = vscode.Uri.joinPath(
                    vscode.workspace.workspaceFolders![0].uri,
                    json.experimentRoot
                );
                fileUri = vscode.Uri.joinPath(
                    vscode.workspace.workspaceFolders![0].uri,
                    json.experimentRoot,
                    relativePath
                );
                return await existence(fileParentUri, fileUri);
            }
            fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, relativePath);
            return await existence(vscode.workspace.workspaceFolders![0].uri, fileUri);
        } catch (err) {
            console.error("dlconfig.json does not exist", err);
            const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, relativePath);
            // console.log("Checking if file exists in workspace:", fileUri.toString());
            return await existence(vscode.workspace.workspaceFolders![0].uri, fileUri);
        }
    }

    async function asyncValidateFilesToIssues(
        data: unknown
    ): Promise<ZodIssue[]> {
        const issues: ZodIssue[] = [];

        async function recurse(
            node: unknown,
            path: (string | number)[] = []
        ): Promise<void> {
            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) {
                    await recurse(node[i], [...path, i]);
                }
            } else if (typeof node === "object" && node !== null) {
                for (const key of Object.keys(node)) {
                    const value = (node as any)[key];
                    const currentPath = [...path, key];

                    if (key === "file" && typeof value === "string") {
                        const data = await fileExistsInWorkspace(value);
                        if (!data.exists) {
                            issues.push({
                                code: z.ZodIssueCode.custom,
                                path: currentPath,
                                message: `File "${value}" does not exist in the workspace. Make sure "${value}" is located in and is written relative to "${data.uri}"`,
                            });
                        }
                    }

                    await recurse(value, currentPath);
                }
            }
        }

        await recurse(data);

        //   console.log("Validation issues found:", issues);
        return issues;
    }

    const missingFiles = asyncValidateFilesToIssues(
        parsedData.toJS() as TreatmentFileType
    ).then((issues: ZodIssue[]) => {
        // console.log("Missing files validation issues:", issues);
        issues.forEach((issue: ZodIssue) => {
            handleError(issue, parsedData, document, diagnostics);
        });
        // Update diagnostics in VS Code
        diagnosticCollection.set(document.uri, diagnostics);
        // console.log("Length of diagnostics for yaml: " + diagnostics.length);
        // console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
    });


    const referenceTypeMap: Record<string, { name: string; line: number }[]> = {};
    const referenceChecks: { type: string; line: number; fullRef: string }[] = [];

    referenceTypeMap['discussion'] = [
        { name: "text", line: 0 },
        { name: "audio", line: 0 },
        { name: "video", line: 0 }
    ];

    referenceTypeMap['connectionInfo'] = [
        { name: "country", line: 0 },
        { name: "timezone", line: 0 },
        { name: "isKnownVpn", line: 0 },
        { name: "timezoneOffset", line: 0 },
        { name: "isLikelyVpn", line: 0 },
        { name: "effectiveType", line: 0 },
        { name: "saveData", line: 0 },
        { name: "downlink", line: 0 },
        { name: "rtt", line: 0 }
    ];

    function walkYaml(node: any, path: (string | number)[] = []) {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach((item, idx) => walkYaml(item, [...path, idx]));
        } else if (typeof node === 'object') {
            // Only track elements of type "survey" for now
            if (node.type === 'survey' && typeof node.name === 'string') {
                // Find the path to the 'name' property
                const namePath = [...path, 'name'];
                const range = findPositionFromPath(namePath, parsedData, document);
                // Default to line 1 if range is not found
                const line = range ? range.start.line + 1 : 1;
                if (!referenceTypeMap['survey']) {
                    referenceTypeMap['survey'] = [];
                }
                referenceTypeMap['survey'].push({ name: node.name, line });
            }
            if (node.type === 'prompt' && typeof node.name === 'string') {
                // Find the path to the 'name' property
                const namePath = [...path, 'name'];
                const range = findPositionFromPath(namePath, parsedData, document);
                // Default to line 1 if range is not found
                const line = range ? range.start.line + 1 : 1;
                if (!referenceTypeMap['prompt']) {
                    referenceTypeMap['prompt'] = [];
                }
                referenceTypeMap['prompt'].push({ name: node.name, line });
            }
            if (node.type === 'submitButton' && typeof node.name === 'string') {
                // Find the path to the 'name' property
                const namePath = [...path, 'name'];
                const range = findPositionFromPath(namePath, parsedData, document);
                // Default to line 1 if range is not found
                const line = range ? range.start.line + 1 : 1;
                if (!referenceTypeMap['submitButton']) {
                    referenceTypeMap['submitButton'] = [];
                }
                referenceTypeMap['submitButton'].push({ name: node.name, line });
            }
            // Track references for any type (future extensibility)
            if (typeof node.reference === 'string' && node.reference.includes('.')) {
                const refPath = [...path, 'reference'];
                const range = findPositionFromPath(refPath, parsedData, document);
                const line = range ? range.start.line + 1 : 1;
                const [type] = node.reference.split('.', 1);
                referenceChecks.push({ type, line, fullRef: node.reference});
            }
            Object.entries(node)?.forEach(([key, value]) => {
                walkYaml(value, [...path, key]);
            });
        }
    }

    // Walk the parsed YAML
    walkYaml(parsedData.toJS({ keepCstNodes: true }));

    // Now check references for each type
    referenceChecks.forEach(({ type, line, fullRef }) => {
        if (type === 'survey') {
            // Only 'survey' type is currently supported
            const name = fullRef.split('.', 2)[1];
            if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(line, 0),
                            new vscode.Position(line, 100)
                        ),
                        `Reference "${fullRef}" does not match any previously defined ${type} element name.`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }
        if (type === 'discussion') {
            // Only 'discussion' type is currently supported
            const name = fullRef.split('.', 2)[1];
            if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(line, 0),
                            new vscode.Position(line, 100)
                        ),
                        `Reference "${fullRef}" does not match audio, type, or video for defined ${type} element name.`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }
        if (type === 'connectionInfo') {
            // Only 'connectionInfo' type is currently supported
            const name = fullRef.split('.', 2)[1];
            if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(line, 0),
                            new vscode.Position(line, 100)
                        ),
                        `Reference "${fullRef}" does not match any defined ${type} element name.`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }
        if (type === 'prompt') {
            // Only 'prompt' type is currently supported
            const name = fullRef.split('.', 2)[1];
            if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(line, 0),
                            new vscode.Position(line, 100)
                        ),
                        `Reference "${fullRef}" does not match any previously defined ${type} element name.`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }
        if (type === 'submitButton') {
            // Only 'submitButton' type is currently supported
            const name = fullRef.split('.', 2)[1];
            if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(line, 0),
                            new vscode
                                .Position(line, 100)
                        ),
                        `Reference "${fullRef}" does not match any previously defined ${type} element name.`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }
    });




}