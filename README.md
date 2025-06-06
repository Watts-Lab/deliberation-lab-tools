# Deliberation Lab Experiment Development Tools

This repository contains tools for researchers and experiment designers to create, validate, and manage experiments for the Deliberation Lab. The main functionality includes a Visual Studio Code (VS Code) extension for syntax highlighting, validation, and YAML schema validation of experiment configuration files (.treatments.yaml + elements built in markdown).

## Project Overview

This VS Code extension enhances experiment design workflows by:

    1.	Providing syntax highlighting for .treatments.yaml files and elements built in markdown.
    2.	Using Zod schemas to validate experiment configurations.
    3.	Diagnosing errors with detailed, line-specific feedback.
    4.	Allowing structured YAML configuration for treatments, sequences, elements, and other experiment components.
    5.	Displaying useful, context-aware validation and error messages for experiment designers.

## Roadmap

- [ ] Prompt file validation
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

## Publishing extension on VSCode Marketplace

- Access our [Azure DevOps organization](https://dev.azure.com/deliberationlab/) -- permission required
- Create a PAT following [VSCode guidelines](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)
  - Provide custom defined scope to `Marketplace` scope with `Manage` access level
  - Make sure the `Organization` is set to `All accessible organizations` (NOT just for our org)
- Update [GitHub repository](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository) with newly generated PAT
