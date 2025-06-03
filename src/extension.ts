import * as vscode from "vscode";
import * as YAML from "yaml";
import {
  treatmentFileSchema,
  TreatmentFileType,
} from "./zod-validators/validateTreatmentFile";
import {
  metadataTypeSchema,
  metadataLogicalSchema,
  MetadataType,
  MetadataRefineType,
} from "./zod-validators/validatePromptFile";
import { ZodError, ZodIssue } from "zod";
import { load as loadYaml } from "js-yaml";

// Detects if file is prompt Markdown format by parsing metadata with YAML
export function detectPromptMarkdown(document: vscode.TextDocument) {
  if (document.languageId === "markdown") {
    console.log("markdown file");

    // define interface for metadata
    interface Metadata {
      type?: string;
      name?: string;
      [key: string]: any;
    }
    console.log("Document text:", document.getText());
    const sections = document.getText().split(/^-{3,}$/gm);
    if (sections.length < 2) {
      return false;
    }
    const metaDataString = sections[1];
    try {
      console.log("MetaDataString:", metaDataString);
      const metaData = loadYaml(metaDataString) as Metadata;
      console.log("MetaData:", metaData);
      console.log("MetaData type:", metaData?.type);
      console.log("MetaData name:", metaData?.name);
      // want to check for undefined rather than null: undefined means that header does not exist, while null means that header does exist but field is empty
      if (metaData === null || metaData === undefined || metaData?.type === undefined || metaData?.name === undefined) {
        return false;
      }
      return true;
    } catch (YAMLException) { // YAMLException means that fields do not exist
      return false;
    }
  }
  return false;
}

// Function to detect if document is treatmentsYaml format - mostly for unit tests
export function detectTreatmentsYaml(document: vscode.TextDocument) {
  console.log("Document languageId:", document.languageId);
  return document.languageId === "treatmentsYaml";
}

// should this be named yamlDiagnostics if also using markdown?
export const diagnosticCollection = vscode.languages.createDiagnosticCollection("yamlDiagnostics");


// export function 
export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage("Extension activated");
  // const diagnosticCollection =
  //   vscode.languages.createDiagnosticCollection("yamlDiagnostics");
  context.subscriptions.push(diagnosticCollection);
  console.log("Extension activated");

  //Converts character offset to line and column in a given document
  function offsetToPosition(offset: number, document: vscode.TextDocument): vscode.Position {
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

  // Returns index an indicated separator. Index is at beginning of the line of the separator
  function getIndex(document: vscode.TextDocument, i: number) {
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

  //helper function to handle errors as diagnostic warnings if yaml doesn't match a schema
  function handleError(issue: ZodIssue, parsedData: YAML.Document.Parsed, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
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
    console.log("diagnostics length on one error: " + diagnostics.length);
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

  function parseDocument(document: vscode.TextDocument) {
    if (detectTreatmentsYaml(document)) {
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
          console.log("document uri IN EXTENSION: " + document.uri.toString());
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
    } else if (detectPromptMarkdown(document)) {
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
            if (response && response.length > 0) {
              let { text, index } = getIndex(document, 3);
              console.log("Finding position of last position");
              const lastPos = document.positionAt(text.length - 1);
              console.log(`Last position: ${lastPos}`);
              const diagnosticRange = new vscode.Range(
                document.positionAt(index),  // starting position
                lastPos   // ending position 
              );
              const issue = "Response should be blank for type no response";
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
    } else {
      // If file is not recognized as treatmentsYaml or promptMarkdown, clear diagnostics
      diagnosticCollection.set(document.uri, []);
      console.log("Length of diagnostic collection (should be 0): " + diagnosticCollection.get(document.uri)!!.length);
    }
  }

  // Should be done once upon activation
  if (vscode.window.activeTextEditor && vscode.window.activeTextEditor?.document) {
    parseDocument(vscode.window.activeTextEditor?.document!!);
  }

  // Listen for when a document is opened
  context.subscriptions.push(

    // for opening document
    vscode.workspace.onDidOpenTextDocument((event) => {
      if (event !== undefined) {
        parseDocument(event);
      }
    }),

    // for changing document
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event?.document !== undefined) {
        parseDocument(event?.document);
      }
    })
  );
}
