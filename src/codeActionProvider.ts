import * as vscode from 'vscode';
import { distance, closest } from 'fastest-levenshtein';

export class FileFixCodeActionProvider implements vscode.CodeActionProvider {
    async provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<(vscode.CodeAction | vscode.Command)[] | null | undefined> {
        console.log('FileFixCodeActionProvider: provideCodeActions called');
        const codeActions: vscode.CodeAction[] = [];
        
        // Check if the document is a YAML file
        if (document.languageId === 'treatmentsYaml') {
            console.log('FileFixCodeActionProvider: Document is a treatmentsYaml file');
            // Create a code action to fix the file
            const fileMissingPattern = /File "(.*)" does not exist in the workspace\. Make sure "(.*)" is located in and is written relative to "(.*)"/;
            for (const diagnostic of context.diagnostics) {
                const match = diagnostic.message.match(fileMissingPattern);
                if (match) {
                    console.log(`FileFixCodeActionProvider: Found file missing pattern in diagnostic: ${diagnostic.message}`);
                    const fileName = match[1];
                    console.log(`FileFixCodeActionProvider: File name extracted: ${fileName}`);
                    const closestExistingFile = await this.iterateFilesInWorkspace(
                        vscode.workspace.getWorkspaceFolder(document.uri)!,
                        fileName
                    );
                    console.log(`FileFixCodeActionProvider: Closest existing file found: ${closestExistingFile}`);
                    const fullText = document.getText();
                    const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const matchTwo = fullText.match(new RegExp(`^\\s*file:\\s*"(${escapedFileName})"\\s*$`, 'm'));
                    console.log(`FileFixCodeActionProvider: Match for file name in document: ${matchTwo}`);
                    if (matchTwo && matchTwo.index !== undefined) {
                        const fullMatchIndex = matchTwo.index!;
                        const fileNameOffset = matchTwo[0].indexOf(matchTwo[1]);
                        const startOffset = fullMatchIndex + fileNameOffset;
                        const endOffset = startOffset + matchTwo[1].length;
                        const startPos = document.positionAt(startOffset); 
                        const endPos = document.positionAt(endOffset);

                        const range = new vscode.Range(startPos, endPos);
                        console.log(`FileFixCodeActionProvider: Range for file name: ${range.start.line}:${range.start.character} - ${range.end.line}:${range.end.character}`);
                        if (closestExistingFile) {
                            const codeAction = new vscode.CodeAction(
                                `Fix file path: ${fileName}`,
                                vscode.CodeActionKind.QuickFix
                            );
                            codeAction.edit = new vscode.WorkspaceEdit();
                            codeAction.edit.replace(
                                document.uri,
                                range,
                                closestExistingFile
                            );
                            codeActions.push(codeAction);
                        } else {
                            console.log(`No closest file found for: ${fileName}`);
                            return codeActions; // No closest file found, return empty
                        }
                    }

                }
            }
        }

        return codeActions;
    }

    async iterateFilesInWorkspace(
        workspaceFolder: vscode.WorkspaceFolder,
        fileName: string
    ): Promise<string | undefined> {
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolder, '**/*'),
            null
        );

        let closestFilePath: string | undefined;
        let closestDistance = 5;

        for (const uri of files) {
            const relativePath = uri.path.replace(workspaceFolder.uri.path + '/', '');
            const currentDistance = distance(fileName, relativePath);
            if (currentDistance < closestDistance) {
                closestDistance = currentDistance;
                closestFilePath = relativePath;
            }
        }
        console.log(`Closest file found: ${closestFilePath} with distance: ${closestDistance}`);
        return closestFilePath;
    }
}