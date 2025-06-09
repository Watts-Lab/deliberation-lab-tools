import * as vscode from "vscode";
import { load as loadYaml } from "js-yaml";

// Helper file containing detection algorithms for file formats (.treatments.yaml and markdown)

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