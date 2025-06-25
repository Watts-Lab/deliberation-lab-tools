# Deliberation Lab Experiment Development Tools

This repository contains tools for researchers and experiment designers to create, validate, and manage experiments for the Deliberation Lab. The main functionality includes a Visual Studio Code (VS Code) extension for syntax highlighting, validation, YAML schema validation of experiment configuration files (.treatments.yaml + elements built in markdown), commands to create default experiment files, and visual previews of markdown elements.

## Features

- **Syntax Highlighting**: Special syntaxes, metadata, and keywords are highlighted in .treatments.yaml and prompt files built in markdown.
- **Document Validation**: The extension will run validations on any .treatments.yaml or markdown file, ensuring that the configuration is correct for experimental templates and providing feedback through error diagnostics if it is not.
- **Error Diagnostics**: Zod schemas are used to provide detailed, line-specific error diagnostics on .treatments.yaml and markdown files.
- **Default File Templates**: Default .treatments.yaml and prompt markdown files can be created through commands accessed from the VS Code menu.

Empty .treatments.yaml files can also be autofilled with a default template.
- **Prompt Visual Previews**: Any prompt markdown file can be previewed on command, which opens up a visual, real-time preview of what the prompt would look like on the Deliberation Lab platform.
- **Multi-Line Comments**:

## Roadmap

- [ ] Timeline visualization for experiment component display
- [ ] Participant preview

## Installation for use

- Find our extension here: https://marketplace.visualstudio.com/items?itemName=deliberation-lab.deliberation-lab-tools

## Installation for development/contribution

In a working directory:

```
# clone the repository from github
git clone git@github.com:Watts-Lab/deliberation-lab-tools.git

# generate .vsix file, need @vscode/vsce installed if not already
vsce package

# install generated package in vscode
code --install-extension [.vsix file generated above]

```

## Tests

Tests are located in the following files, separated by their functionality:

```
src/test/suite/detection.test.ts
src/test/suite/diagnostics.test.ts
src/test/suite/preview.test.ts
```

The file ```src/runExtensionTests.js``` runs a test script that calls the file ```src/test/suite/index.ts``` to execute these tests. All tests can be run at once with ```npm test``` (if this command is not working, make sure you run ```npm install``` first).

If you want to test only one or a few test files, then run ```npm test --TEST_FILES {test_file_name} {test_file_name} ...```, making sure to separate specific test file names by spaces. For example, ```npm test --TEST_FILES detection.test.js``` runs only detection algorithm tests, and ```npm test --TEST_FILES diagnostics.test.js``` runs only diagnostic tests. ```npm test --TEST_FILES detection.test.js diagnostics.test.js``` runs both files in the specified order.

## Publishing extension on VSCode Marketplace

- Access our [Azure DevOps organization](https://dev.azure.com/deliberationlab/) -- permission required
- Create a PAT following [VSCode guidelines](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)
  - Provide custom defined scope to `Marketplace` scope with `Manage` access level
  - Make sure the `Organization` is set to `All accessible organizations` (NOT just for our org)
- Update [GitHub repository](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository) with newly generated PAT

## Issues and Feedback

If you have a suggestion, an idea for a new feature, or an issue that you have noticed with our extension, please add it to our GitHub issues page at https://github.com/Watts-Lab/deliberation-lab-tools/issues.
