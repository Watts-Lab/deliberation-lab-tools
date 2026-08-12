/* eslint-disable no-restricted-syntax */

import * as vscode from "vscode";
import * as yaml from "js-yaml";

// Import PURE logic from the generated core file
import {
  substituteFields,
  expandTemplate,
  recursivelyFillTemplates,
  fillTemplates,
  type TemplateDef,
  type TemplateContext,
  type JsonLike,
} from "./fillTemplates";

// Re-export so extension code can continue using normal imports
export {
  substituteFields,
  expandTemplate,
  recursivelyFillTemplates,
  fillTemplates,
  type TemplateDef,
  type TemplateContext,
  type JsonLike,
};

export const EXP_SCHEME = "deliberation-expanded";
const MAX_LINES = 10_000;

/**
 * VS Code TextDocumentContentProvider for previewing expanded templates.
 * Pure template logic happens inside fillTemplatesCore.ts.
 */
export class ExpandedTemplatesProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  private _srcByPreview = new Map<string, vscode.Uri>();

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const qp = new URLSearchParams(uri.query);
    const srcStr = qp.get("src");
    if (!srcStr) return "# Error: missing source URI\n";

    const src = vscode.Uri.parse(srcStr);
    this._srcByPreview.set(uri.toString(), src);

    try {
      const raw = await vscode.workspace.fs.readFile(src);
      const text = new TextDecoder("utf-8").decode(raw);
      const obj = yaml.load(text) as any;

      // Extract templates from file
      const templates: TemplateDef[] =
        Array.isArray(obj?.templates)
          ? obj.templates
          : Array.isArray(obj?.templateLibrary)
          ? obj.templateLibrary
          : [];

      // Attempt full expansion
      let expanded: any;
      let warning: string | undefined;

      try {
        expanded = fillTemplates({ obj, templates });
      } catch (e: any) {
        warning = String(e?.message ?? e);

        // Partial fallback expansion
        let tmp = recursivelyFillTemplates({ obj, templates });
        const tag = /"template":/g;

        while (JSON.stringify(tmp).match(tag)) {
          tmp = recursivelyFillTemplates({ obj: tmp, templates });
        }

        expanded = tmp;
      }

      // Remove template definitions before previewing
      if (expanded && typeof expanded === "object") {
        delete (expanded as any).templates;
        delete (expanded as any).templateLibrary;
      }

      const dumped = yaml.dump(expanded, {
        noRefs: true,
        sortKeys: false,
        lineWidth: 100,
      });

      const body = applyTruncation(dumped, MAX_LINES);
      const header =
        `# Preview (read-only): Expanded templates\n` +
        `# Source: ${src.fsPath}\n` +
        (warning ? `# Warning: ${warning}\n` : "") +
        (body.truncated
          ? `# Note: output truncated to ${MAX_LINES} lines\n`
          : "") +
        `\n`;

      return header + body.text;
    } catch (err: any) {
      return `# Error generating expanded YAML\n# ${err?.message ?? String(err)}\n`;
    }
  }

  /** Notify previews that the underlying source was updated. */
  refreshForSource(source: vscode.Uri) {
    for (const [previewKey, src] of this._srcByPreview.entries()) {
      if (src.toString() === source.toString()) {
        this._onDidChange.fire(vscode.Uri.parse(previewKey));
      }
    }
  }
}

function applyTruncation(
  s: string,
  maxLines: number
): { text: string; truncated: boolean } {
  const lines = s.split(/\r?\n/);
  if (lines.length <= maxLines) return { text: s, truncated: false };

  const slice = lines.slice(0, maxLines);
  slice.push("# … truncated …");

  return { text: slice.join("\n"), truncated: true };
}
