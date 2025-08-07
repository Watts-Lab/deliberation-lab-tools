# Change Log

All notable changes to the "deliberation-lab-tools" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.4]

### Added

- **Render StageFrame**: Command to render stages from .treatments.yaml file with StageFrame to toggle between different frames
- **Display Render Errors**: ErrorBoundary wrapper around rendering to catch and display errors
- **Introduce experimentRoot in dlconfig.json**: Users must now specify the `experimentRoot` in their `dlconfig.json` file. This must be a path where all experiment files will be kept. This is required.
- **Validate batch config**: The extension will run validations on `.config.json` file (on files within the experimentRoot defined in dlconfig.json), ensuring that the configuration is correct and providing feedback through error diagnostics if it is not.

## [0.0.3]

### Added

- **Syntax Highlighting**: Special syntaxes, metadata, and keywords are highlighted in .treatments.yaml and prompt files built in markdown.
- **Document Validation**: The extension will run validations on any .treatments.yaml or markdown file, ensuring that the configuration is correct for experimental templates and providing feedback through error diagnostics if it is not.
- **Error Diagnostics**: Zod schemas are used to provide detailed, line-specific error diagnostics on .treatments.yaml and markdown files.
- **Default File Templates**: Default .treatments.yaml and prompt markdown files can be created through commands accessed from the VS Code menu. Empty .treatments.yaml files can also be autofilled with a default template.
- **Prompt Visual Previews**: Any prompt markdown file can be previewed on command, which opens up a visual, real-time preview of what the prompt would look like on the Deliberation Lab platform.
- **Multi-Line Comments**: On any .treatments.yaml file, highlight a section of text and use `Ctrl + /` to comment out each line of selected text at once.
