import * as vscode from 'vscode';
import * as YAML from "yaml";
import { ZodIssue } from "zod";

// Helper file for functions to index and find positions in documents
// Includes handleError for Zod indexing

// Converts character offset to line and column in a given document
export function offsetToPosition(offset: number, document: vscode.TextDocument): vscode.Position {
    const text = document.getText();
    let line = 0;
    let lastLineBreakIndex = -1;

    // Count lines and adjust the column based on the last newline before the offset
    for (let i = 0; i < offset; i++) {
        if (text[i] === "\n") {
            line++;
            lastLineBreakIndex = i;
        }
    }

    const column = offset - lastLineBreakIndex - 1;
    return new vscode.Position(line, column);
}

// Returns index of an indicated separator. Index is at beginning of the line of the separator
export function getIndex(document: vscode.TextDocument, i: number) {
    const text = document.getText();
    let t = text;
    const regex = /^-{3,}$/gm;

    let match;
    let count = 0;
    let index = 0;

    while ((match = regex.exec(text)) !== null) {
        count++;
        if (count === i) {
            index = match.index;
            break;
        }
    }

    return { text, index };
}

// helper function to handle errors as diagnostic warnings if yaml doesn't match a schema
export function handleError(issue: ZodIssue, parsedData: YAML.Document.Parsed, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    console.log(
        `Processing Zod issue with path: ${JSON.stringify(issue.path)}`
    );
    const range = findPositionFromPath(
        issue.path,
        parsedData,
        document
    );
    const diagnosticRange =
        range ||
        new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 1)
        );
    diagnostics.push(
        new vscode.Diagnostic(
            diagnosticRange,
            `Error in item "${issue.path[issue.path.length - 1]}": ${issue.message
            }`,
            vscode.DiagnosticSeverity.Warning
        )
    );
}

// Helper function to find the position of a node in the AST based on the path  
function findPositionFromPath(
    path: (string | number)[],
    astNode: any,
    document: vscode.TextDocument // Pass the document as an additional parameter
): vscode.Range | null {
    if (!astNode) {
        // console.log("AST Node is undefined or null at the start.");
        return null;
    }

    let currentNode = astNode.contents;
    let currentRange = currentNode.range;

    if (!currentNode) {
        // console.log("Root contents of AST are undefined.");
        return null;
    }

    // console.log("Navigating path:", path);

    // Traverse the AST node based on path segments
    for (const segment of path) {
        // console.log(`Current segment: ${segment}`);
        // console.log("Current node contents:", currentNode.items);
        // console.log("Current node range:", currentRange);
        // console.log("Current node keys:", Object.keys(currentNode));

        // console.log("Current node:", currentNode);
        currentNode = currentNode.get(segment);
        if (currentNode && currentNode.range) {
            currentRange = currentNode.range;
        } else {
            console.log("No range found for node:");
            console.log(currentNode);
            console.log(segment);
        }
    }
    console.log("Found terminal node", currentNode);
    console.log("Terminal node range:", currentRange);

    // convert the character offsetts to vscode positions
    // currentRange is a list `[start, value-end, node-end]` of character offsets for the part
    // of the source parsed into this node (undefined if not parsed).
    // The `value-end` and `node-end` positions are themselves not
    // included in their respective ranges.
    // Convert character offsets to vscode positions if a range is found
    if (currentRange) {
        const [startOffset, endOffset] = currentRange;

        // Helper function to convert offset to line and column

        const startPos = offsetToPosition(startOffset, document);
        const endPos = offsetToPosition(endOffset, document);
        console.log(
            `Located range: start ${startPos.line}:${startPos.character}, end ${endPos.line}:${endPos.character}`
        );
        return new vscode.Range(startPos, endPos);
    }

    console.log("No range identified for the provided path.");
    return null;
}