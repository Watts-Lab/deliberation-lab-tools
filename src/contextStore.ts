import * as vscode from "vscode";

let extensionContext: vscode.ExtensionContext;

export function setExtensionContext(context: vscode.ExtensionContext) {
  extensionContext = context;
}

export function getExtensionUri(): vscode.Uri {
  return extensionContext.extensionUri;
}