import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { diagnosticCollection } from '../extension';
import { metadataLogicalSchema,
    MetadataRefineType,
    metadataTypeSchema,
    MetadataType } from '../zod-validators/validatePromptFile';
import { ZodError, ZodIssue } from 'zod';
import { handleError, getIndex, offsetToPosition } from '../errorPosition';

// Markdown validator

export function parseMarkdown(document: vscode.TextDocument) {
    console.log("Processing .md file...");
    const diagnostics: vscode.Diagnostic[] = [];

    // getting the separators from the document
    console.log("Document URI:", document.uri.toString());
    const separators = document.getText().match(/^-{3,}$/gm);
    console.log("Separators found:", separators);

    //getting the three sections of the document
    let sections = document.getText().split(/^-{3,}$/gm);
    console.log("Sections found:", sections);

    // Check if the number of separators is correct
    if (!separators || separators.length !== 3) {
        console.log("Invalid number of separators");
        diagnostics.push(
            new vscode.Diagnostic(
                new vscode.Range(
                    new vscode.Position(0, 0),
                    new vscode.Position(0, 3)
                ),
                "Invalid number of separators, should be 3",
                vscode.DiagnosticSeverity.Error
            )
        );
    }

    //getting the relative path of the file for comparison with name field in metadata
    let relativePath = "";
    try {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        console.log("Workspace folder:", workspaceFolder);
        // Is it possible to have a prompt markdown file not in a repository/folder opened in VSCode?
        // If so, we should add an else case to catch this edge case - could just set relative path to full file system path
        if (workspaceFolder) {
            relativePath = vscode.workspace.asRelativePath(document.uri);
            console.log("Relative path:", relativePath);
        }
    } catch (error) {
        console.error("Error getting workspace folder:", error);
    }

    //getting the Metadata section and processing it
    let yamlText = "";
    try {
        yamlText = sections[1];
        if (!yamlText) {
            throw new Error("No YAML frontmatter found");
        }
        yamlText = yamlText.trimEnd();
        console.log("YAML frontmatter:", yamlText);
    } catch (error) {
        console.log("Error retrieving YAML frontmatter:", error);
    }


    // Parse YAML content into AST
    let parsedData;
    try {
        parsedData = YAML.parseDocument(yamlText, {
            keepCstNodes: true,
            keepNodeTypes: true,
        } as any);
        console.log("YAML parsed successfully.", parsedData);
    } catch (error) {
        console.log("Error parsing YAML:", error);
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
            console.log("Length of diagnostics: " + diagnostics.length);
            console.log("Length of diagnostic collection: " + diagnosticCollection.get(document.uri)!!.length);
        }
        return;
    }

    console.log("Relative path before passing into schema: " + relativePath);

    //Metadata validation
    const result = metadataLogicalSchema(relativePath).safeParse(
        parsedData.toJS() as MetadataRefineType
    );
    console.log("result obtained from metadataSchema:", result);

    if (!result.success) {
        console.log("Zod validation failed:", result.error.issues);

        (result.error as ZodError).issues.forEach(
            (issue: ZodIssue) => {
                handleError(issue, parsedData, document, diagnostics);
            }
        );
    } else {
        console.log("Zod validation passed. Types are consistent with MetadataType.");
    }

    const resultTwo = metadataTypeSchema.safeParse(
        parsedData.toJS() as MetadataType
    );
    console.log("resultTwo obtained from metadataBaseSchema:", resultTwo);
    if (!resultTwo.success) {
        console.log("Zod validation failed:", resultTwo.error.issues);

        (resultTwo.error as ZodError).issues.forEach(
            (issue: ZodIssue) => {
                handleError(issue, parsedData, document, diagnostics);
            }
        );
    } else {
        console.log("Zod validation passed. Types are consistent with MetadataType.");
    }

    // Prompt validation
    if (sections && sections.length > 2) {
        const promptText = sections[2].trim();
        console.log("Prompt text:", promptText);
        if (!promptText || typeof promptText !== "string" || promptText.length < 1) {
            let { text, index } = getIndex(document, 2);
            const startPos = offsetToPosition(index, document);
            diagnostics.push(
                new vscode.Diagnostic(
                    new vscode.Range(
                        startPos,
                        new vscode.Position(startPos.line, startPos.character + 3)
                    ),
                    "Prompt text must exist",
                    vscode.DiagnosticSeverity.Warning
                )
            );
        }
    }

    // Response validation
    if (separators && separators.length === 3) {
        console.log("Entering if statement");
        const type = parsedData.get("type");
        const response = sections[3];
        switch (type) {

            // no response warning position handling
            case "noResponse": {
                console.log("Entering no response case");
                if (response && !(/^\s*$/.test(response))) {
                    let { text, index } = getIndex(document, 3);
                    console.log("Finding position of last position");
                    const lastPos = document.positionAt(text.length - 1);
                    console.log(`Last position: ${lastPos}`);
                    const diagnosticRange = new vscode.Range(
                        document.positionAt(index),  // starting position
                        lastPos   // ending position 
                    );
                    const issue = "Response should be blank or only whitespace for type no response";
                    diagnostics.push(
                        new vscode.Diagnostic(
                            diagnosticRange,
                            issue,
                            vscode.DiagnosticSeverity.Warning
                        )
                    );
                }
                break;
            }

            // multiple choice warning position handling
            case "multipleChoice": {
                console.log("Entering multiple choice case");
                let { text, index } = getIndex(document, 3);
                const lineNum = (document.positionAt(index).line) + 1;
                console.log(lineNum);
                console.log("Line count: " + document.lineCount);
                for (let i = lineNum; i < document.lineCount; i++) {
                    const str = document.lineAt(i).text;
                    console.log(str);
                    if (str.substring(0, 2) !== "- ") {
                        const diagnosticRange = new vscode.Range(
                            new vscode.Position(i, 0),
                            new vscode.Position(i, str.length)
                        );
                        const issue = `Response at line ${i + 1} should start with "- " (for multiple choice)`;
                        diagnostics.push(
                            new vscode.Diagnostic(
                                diagnosticRange,
                                issue,
                                vscode.DiagnosticSeverity.Warning
                            )
                        );
                    }
                }
                break;
            }

            // open response warning position handling          
            case "openResponse": {
                console.log(response);
                console.log("Entering open response case");
                let { text, index } = getIndex(document, 3);
                const lineNum = (document.positionAt(index).line) + 1;
                console.log(lineNum);
                for (let i = lineNum; i < document.lineCount; i++) {
                    const str = document.lineAt(i).text;
                    if (str.substring(0, 2) !== "> ") {
                        const diagnosticRange = new vscode.Range(
                            new vscode.Position(i, 0),
                            new vscode.Position(i, str.length)
                        );
                        const issue = `Response at line ${i + 1} should start with "> " (for open response)`;
                        diagnostics.push(
                            new vscode.Diagnostic(
                                diagnosticRange,
                                issue,
                                vscode.DiagnosticSeverity.Warning
                            )
                        );
                    }
                }
                break;
            }
            default: {
                console.log("Type: " + type);
                break;
            }

        }

    }

    // Update diagnostics in VS Code
    diagnosticCollection.set(document.uri, diagnostics);
    console.log("Length of diagnostics for markdown: " + diagnostics.length);
    console.log("Length of diagnostic collection: " + diagnosticCollection.get(document.uri)!!.length);
}