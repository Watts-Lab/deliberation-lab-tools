import * as vscode from "vscode";
import YAML from "yaml";
import { topSchema, TopType } from "../zod-validators/validateTreatmentFile";
import { ZodError, ZodIssue } from "zod";
import { isMap, isSeq, isScalar } from "yaml"; // Import type-checking functions

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Extension activated");
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("yamlDiagnostics");
  context.subscriptions.push(diagnosticCollection);

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

      currentNode = currentNode.get(segment);
      currentRange = currentNode.range;
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
      function offsetToPosition(offset: number): vscode.Position {
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

      const startPos = offsetToPosition(startOffset);
      const endPos = offsetToPosition(endOffset);
      console.log(
        `Located range: start ${startPos.line}:${startPos.character}, end ${endPos.line}:${endPos.character}`
      );
      return new vscode.Range(startPos, endPos);
    }

    console.log("No range identified for the provided path.");
    return null;
  }

  // Listen for changes in YAML files
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === "treatmentsYaml") {
        console.log("Processing .treatments.yaml file...");
        const diagnostics: vscode.Diagnostic[] = [];

        // Parse YAML content into AST
        let parsedData;
        try {
          parsedData = YAML.parseDocument(event.document.getText(), {
            keepCstNodes: true,
            keepNodeTypes: true,
          } as any);
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
            diagnosticCollection.set(event.document.uri, diagnostics);
          }
          return;
        }

        // Validate YAML content using Zod and TopType
        console.log("Running Zod validation...");
        const validationResult = topSchema.safeParse(
          parsedData.toJS() as TopType
        );

        if (!validationResult.success) {
          console.log("Zod validation failed:", validationResult.error.issues);

          (validationResult.error as ZodError).issues.forEach(
            (issue: ZodIssue) => {
              console.log(
                `Processing Zod issue with path: ${JSON.stringify(issue.path)}`
              );
              const range = findPositionFromPath(
                issue.path,
                parsedData,
                event.document
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
                  `Validation error: ${issue.message}`,
                  vscode.DiagnosticSeverity.Warning
                )
              );
            }
          );
        } else {
          console.log(
            "Zod validation passed. Types are consistent with TopType."
          );
        }

        // Update diagnostics in VS Code
        diagnosticCollection.set(event.document.uri, diagnostics);
      }
    })
  );
}
