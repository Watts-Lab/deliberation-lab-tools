import * as vscode from "vscode";
import { load as loadYaml } from "js-yaml";
import * as path from "path";

// Helper file containing detection algorithms for file formats (.treatments.yaml and markdown)

// Detects if file is prompt Markdown format by parsing metadata with YAML
export function detectPromptMarkdown(document: vscode.TextDocument) {
  if (document.languageId === "markdown" || document.languageId === "promptMarkdown") {
    // console.log("Markdown file");

    // define interface for metadata
    interface Metadata {
      type?: string;
      name?: string;
      [key: string]: any;
    }

    const sections = document.getText().split(/^-{3,}$/gm);
    if (sections.length < 2) {
      return false;
    }
    const metaDataString = sections[1];
    try {
      const metaData = loadYaml(metaDataString) as Metadata;

      // Want to check for undefined rather than null: undefined means that header does not exist, while null means that header does exist but field is empty
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
  // console.log("Document languageId:", document.languageId);
  if (document.languageId === "treatmentsYaml") return true;
  // Fallback: detect by file name suffix in case languageId isn't set to the contributed language
  const fileName = document.fileName || "";
  if (fileName.endsWith(".treatments.yaml") || fileName.endsWith(".treatments.yml")) return true;
  return false;
}

export function detectdlConfig(document: vscode.TextDocument) {
  // console.log("Document name:", document.fileName);
  return vscode.workspace.asRelativePath(document.uri, false) === "dlconfig.json";
}

export async function detectBatchConfig(document: vscode.TextDocument) {
  try {
    const fileConfigUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'dlconfig.json');
    // console.log("Checking if dlconfig.json exists in workspace");
    await vscode.workspace.fs.stat(fileConfigUri);
    const fileData = await vscode.workspace.fs.readFile(fileConfigUri);
    const fileContent = new TextDecoder('utf-8').decode(fileData);
    const json = JSON.parse(fileContent);
    const fileParentUri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      json.experimentRoot
    );
    const dlconfigPath = fileParentUri.fsPath;
    const batchConfigPath = document.fileName;
    const relative = path.relative(dlconfigPath, batchConfigPath);
    if (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      return document.fileName.endsWith(".config.json");
    } else {
      return false;
    }
  } catch (err) {
    return false;
  }
}
