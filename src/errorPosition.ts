import * as vscode from 'vscode';
import * as YAML from "yaml";
import type { ASTNode, ObjectNode, PropertyNode, ArrayNode } from 'json-to-ast';
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

function isAstNode(node: unknown): node is ASTNode {
  return typeof node === "object" &&
    node !== null &&
    typeof (node as any).type === "string" &&
    ("loc" in node || "children" in node || "key" in node);
}

// helper function to handle errors as diagnostic warnings if yaml doesn't match a schema
export function handleError(issue: ZodIssue, parsedData: YAML.Document.Parsed | ASTNode, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
    // console.log(
    //     `Processing Zod issue with path: ${JSON.stringify(issue.path)}`
    // );
    let range: vscode.Range | null = null;
    if (isAstNode(parsedData)) {
        // console.log("Parsed data is an AST node.");
        range = findPositionFromPathJson(
            issue.path,
            parsedData,
            document
        ); 
        // console.log("Found range:", range);
    } else {
        range = findPositionFromPath(
            issue.path,
            parsedData,
            document
        );
    }
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

export function findPositionFromPathJson(
  path: (string | number)[],
  ast: ASTNode,
  document: vscode.TextDocument
): vscode.Range | null {
  let currentNode: ASTNode | undefined = ast;

  for (const segment of path) {
    if (!currentNode) return null;

    if (currentNode.type === "Object" && typeof segment === "string") {
      const prop: PropertyNode | undefined = (currentNode as ObjectNode).children.find(
        (p) => p.key.value === segment
      );
      if (!prop) return null;
      currentNode = prop.value;
    } else if (currentNode.type === "Array" && typeof segment === "number") {
      const elements: ASTNode[] = (currentNode as ArrayNode).children;
      currentNode = elements[segment];
      if (!currentNode) return null;
    } else {
      return null;
    }
  }

  if (!currentNode?.loc) return null;

  const startPos = new vscode.Position(
    currentNode.loc.start.line - 1,
    currentNode.loc.start.column - 1
  );
  const endPos = new vscode.Position(
    currentNode.loc.end.line - 1,
    currentNode.loc.end.column - 1
  );

  return new vscode.Range(startPos, endPos);
}

// Helper function to find the position of a node in the AST based on the path  
export function findPositionFromPath(
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
            // console.log("No range found for node:", currentNode, segment);
        }
    }

    // convert the character offsets to vscode positions
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
        // console.log(
        //     `Located range: start ${startPos.line}:${startPos.character}, end ${endPos.line}:${endPos.character}`
        // );
        return new vscode.Range(startPos, endPos);
    }

    // console.log("No range identified for the provided path.");
    return null;
}