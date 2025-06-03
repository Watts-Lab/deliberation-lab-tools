# Deliberation Lab Experiment Development Tools

This repository contains tools for researchers and experiment designers to create, validate, and manage experiments for the Deliberation Lab. The main functionality includes a Visual Studio Code (VS Code) extension for syntax highlighting, validation, and YAML schema validation of experiment configuration files (.treatments.yaml).

## Project Overview

This VS Code extension enhances experiment design workflows by:

    1.	Providing syntax highlighting for .treatments.yaml files.
    2.	Using Zod schemas to validate experiment configurations.
    3.	Diagnosing errors with detailed, line-specific feedback.
    4.	Allowing structured YAML configuration for treatments, sequences, elements, and other experiment components.
    5.	Displaying useful, context-aware validation and error messages for experiment designers.

## Roadmap

- [ ] Prompt file validation
- [ ] Timeline visualization for experiment component display
- [ ] Participant preview

# Installation

In a working directory:

```
# download the extension from github
wget https://github.com/Watts-Lab/deliberation-lab-tools/raw/main/deliberation-lab-tools-0.0.1.vsix -P .

# install in vscode
code --install-extension deliberation-lab-tools-0.0.1.vsix
```

# Tests

Tests are located in the following files, separated by their functionality:

```
src/test/suite/detection.test.ts
src/test/suite/diagnostics.test.ts
```

The file ```src/runExtensionTests.js``` runs a test script that calls the file ```src/test/suite/index.ts``` to execute these tests. All tests can be run at once with ```npm test``` (if this command is not working, make sure you run ```npm install``` first).

If you want to test only one or a few test files, then run ```npm test --TEST_FILES {test_file_name} {test_file_name} ...```, making sure to separate specific test file names by spaces. For example, ```npm test --TEST_FILES detection.test.js``` runs only detection algorithm tests, and ```npm test --TEST_FILES diagnostics.test.js``` runs only diagnostic tests. ```npm test --TEST_FILES detection.test.js diagnostics.test.js``` runs both files in the specified order.