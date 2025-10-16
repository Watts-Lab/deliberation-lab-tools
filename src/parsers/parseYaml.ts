import * as vscode from 'vscode';
import { load as loadYaml, YAMLException } from "js-yaml";
import * as YAML from 'yaml';
import { diagnosticCollection } from '../extension';
import { z, ZodError, ZodIssue } from "zod";
import {
    treatmentFileSchema,
    TreatmentFileType,
} from "../zod-validators/validateTreatmentFile";
import { handleError, offsetToPosition, findPositionFromPath } from "../errorPosition";
import { parse } from 'path';
import { off } from 'process';


type CheckedType = 'prompt' | 'survey' | 'submitButton';
const CHECKED_TYPES: CheckedType[] = ['prompt', 'survey', 'submitButton'];

interface RefKey { type: CheckedType; name: string; }
interface OccurrenceBase { stageIndex: number; path: (string | number)[]; }
interface InitOccurrence extends OccurrenceBase { key: RefKey; }
interface RefOccurrence extends OccurrenceBase { key: RefKey; raw: string; dynamic: boolean; }

interface StageDescriptor {
  stageIndex: number;
  // Path to the stage node in the YAML AST (used to compute element paths)
  path: (string | number)[];
  // The stage object (should contain an `elements` array)
  node: any;
  // For context/debug
  kind: 'intro' | 'game' | 'exit';
  name?: string;
}

// ------------------------------ Template flattening helpers ------------------------------

// Returns a deep-cloned value
function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

// If a node is a template context, resolve to its templateContent (ignoring fields/broadcast for ordering).
// We only need structure to find init names + refs; any ${...} names are treated as dynamic and skipped later.
function expandTemplateContextIfAny(
  node: any,
  templateMap: Map<string, { idx: number; content: any }>
): any {
  if (!node || typeof node !== 'object') return node;
  if (!('template' in node)) return node;

  const tplName = (node as any).template;
  if (!tplName || !templateMap.has(tplName)) return node;
  // Use raw template content for ordering/static scanning
  return clone(templateMap.get(tplName)!.content);
}

// Flatten arrays that may contain template contexts whose contents are
//   - elements (element / elements)
//   - stages (stage / stages / gameStages)
//   - intro steps (introSequence / introSequences)
//   - exitSteps
// We recurse as needed to yield a homogeneous list for the caller.
function flattenArrayWithTemplates(
  arr: any[],
  kind: 'elements' | 'stages' | 'introSteps' | 'exitSteps',
  templateMap: Map<string, { idx: number; content: any }>
): any[] {
  const out: any[] = [];
  for (const item of arr ?? []) {
    const resolved = expandTemplateContextIfAny(item, templateMap);

    // If the resolved thing is itself a container, pluck out the right child per kind
    if (resolved && typeof resolved === 'object') {
      if (kind === 'elements') {
        if (Array.isArray(resolved.elements)) {
          out.push(...flattenArrayWithTemplates(resolved.elements, 'elements', templateMap));
          continue;
        }
        if ((resolved as any).type) { out.push(resolved); continue; } // single element
      } else if (kind === 'stages') {
        if (Array.isArray(resolved.gameStages)) {
          out.push(...flattenArrayWithTemplates(resolved.gameStages, 'stages', templateMap));
          continue;
        }
        if (Array.isArray(resolved.stages)) {
          out.push(...flattenArrayWithTemplates(resolved.stages, 'stages', templateMap));
          continue;
        }
        if ((resolved as any).elements) {
          // normalize stage { name?, elements: [...] }
          out.push({ ...resolved, elements: flattenArrayWithTemplates(resolved.elements, 'elements', templateMap) });
          continue;
        }
      } else if (kind === 'introSteps') {
        if (Array.isArray(resolved.introSteps)) {
          out.push(...flattenArrayWithTemplates(resolved.introSteps, 'introSteps', templateMap));
          continue;
        }
        if ((resolved as any).elements) {
          out.push({ ...resolved, elements: flattenArrayWithTemplates(resolved.elements, 'elements', templateMap) });
          continue;
        }
      } else if (kind === 'exitSteps') {
        if (Array.isArray(resolved.exitSteps)) {
          out.push(...flattenArrayWithTemplates(resolved.exitSteps, 'exitSteps', templateMap));
          continue;
        }
        if ((resolved as any).elements) {
          out.push({ ...resolved, elements: flattenArrayWithTemplates(resolved.elements, 'elements', templateMap) });
          continue;
        }
      }
    }

    // Primitive or already the right shape
    out.push(resolved);
  }
  return out;
}

// ------------------------------ Parsing helpers ------------------------------

function parseReferenceString(ref: string): { key: RefKey | null; dynamic: boolean } {
  if (typeof ref !== 'string') return { key: null, dynamic: false };
  const s = ref.trim();
  // We only care about refs that begin with one of our types + '.'
  const firstDot = s.indexOf('.');
  if (firstDot <= 0) return { key: null, dynamic: false };
  const prefix = s.slice(0, firstDot) as CheckedType;
  if (!CHECKED_TYPES.includes(prefix)) return { key: null, dynamic: false };
  const rest = s.slice(firstDot + 1);
  const namePart = rest.split('.')[0]; // e.g., survey.real.done -> name=real
  const dynamic = namePart.includes('${');
  if (!namePart || dynamic) {
    return { key: null, dynamic };
  }
  return { key: { type: prefix, name: namePart }, dynamic };
}

function safeArray(x: any): any[] { return Array.isArray(x) ? x : []; }
function hasElementsArray(stage: any): boolean { return stage && Array.isArray(stage.elements); }

// ------------------------------ Stage collection (templates-aware) ------------------------------

function buildTemplateMap(root: any): Map<string, { idx: number; content: any }> {
  const out = new Map<string, { idx: number; content: any }>();
  for (const [i, t] of safeArray(root?.templates).entries()) {
    const name = t?.templateName;
    if (name && t?.templateContent) out.set(String(name), { idx: i, content: t.templateContent });
  }
  return out;
}

function collectIntroStages(root: any, templateMap: Map<string, { idx: number; content: any }>): StageDescriptor[] {
  const stages: StageDescriptor[] = [];
  const seqs = safeArray(root?.introSequences);
  let stageCounter = 0;

  for (let i = 0; i < seqs.length; i++) {
    // introSteps may themselves contain template contexts producing intro steps/elements
    const flatSteps = flattenArrayWithTemplates(safeArray(seqs[i]?.introSteps), 'introSteps', templateMap);
    for (let s = 0; s < flatSteps.length; s++) {
      // Also ensure elements inside an introStep are flattened (element templates)
      const node = flatSteps[s];
      const flatElements = flattenArrayWithTemplates(safeArray(node?.elements), 'elements', templateMap);
      stages.push({
        stageIndex: stageCounter++,
        path: ['introSequences', i, 'introSteps', s],
        node: { ...node, elements: flatElements },
        kind: 'intro',
        name: node?.name,
      });
    }
  }
  return stages;
}

// Template-provided intros for a given treatment (if the treatment's template includes them)
function collectTemplateIntroStagesForTreatment(
  root: any,
  tIdx: number,
  templateMap: Map<string, { idx: number; content: any }>
): StageDescriptor[] {
  const stages: StageDescriptor[] = [];
  const treatment = safeArray(root?.treatments)[tIdx] ?? {};
  const tplName = treatment?.template;

  if (!tplName || !templateMap.has(tplName)) return stages;
  const { idx: tplIdx, content } = templateMap.get(tplName)!;
  const rawSeqs = safeArray(content?.introSequences);

  let stageCounter = 0;
  for (let i = 0; i < rawSeqs.length; i++) {
    const flatSteps = flattenArrayWithTemplates(safeArray(rawSeqs[i]?.introSteps), 'introSteps', templateMap);
    for (let s = 0; s < flatSteps.length; s++) {
      const node = flatSteps[s];
      const flatElements = flattenArrayWithTemplates(safeArray(node?.elements), 'elements', templateMap);
      stages.push({
        stageIndex: stageCounter++,
        path: ['templates', tplIdx, 'templateContent', 'introSequences', i, 'introSteps', s],
        node: { ...node, elements: flatElements },
        kind: 'intro',
        name: node?.name,
      });
    }
  }
  return stages;
}

// Only returns the treatment "body": game stages and exit steps (inline or from template)
// (All intros are handled separately and occur before these.)
function collectBodyStagesForTreatment(
  root: any,
  tIdx: number,
  templateMap: Map<string, { idx: number; content: any }>
): StageDescriptor[] {
  const stages: StageDescriptor[] = [];
  const treatment = safeArray(root?.treatments)[tIdx] ?? {};
  let stageCounter = 0;

  // Determine where to get game/exit from: treatment itself or its template
  let gameStages: any[] | undefined;
  let exitSequence: any[] | undefined;
  let basePathForGame: (string | number)[] | undefined;
  let basePathForExit: (string | number)[] | undefined;

  if (Array.isArray(treatment?.gameStages) || Array.isArray(treatment?.exitSequence)) {
    gameStages = safeArray(treatment.gameStages);
    exitSequence = safeArray(treatment.exitSequence);
    basePathForGame = ['treatments', tIdx, 'gameStages'];
    basePathForExit = ['treatments', tIdx, 'exitSequence'];
  } else if (treatment?.template && templateMap.has(treatment.template)) {
    const { idx: tplIdx, content } = templateMap.get(treatment.template)!;
    gameStages = safeArray(content?.gameStages);
    exitSequence = safeArray(content?.exitSequence);
    basePathForGame = ['templates', tplIdx, 'templateContent', 'gameStages'];
    basePathForExit = ['templates', tplIdx, 'templateContent', 'exitSequence'];
  } else {
    return stages;
  }

  // Flatten stage arrays (template contexts may embed stages)
  const flatGameStages = flattenArrayWithTemplates(gameStages ?? [], 'stages', templateMap);
  const flatExitSteps = flattenArrayWithTemplates(exitSequence ?? [], 'exitSteps', templateMap);

  // Game stages (ensure elements are flattened)
  for (let s = 0; s < flatGameStages.length; s++) {
    const stageNode = flatGameStages[s];
    const flatElements = flattenArrayWithTemplates(safeArray(stageNode?.elements), 'elements', templateMap);
    stages.push({
      stageIndex: stageCounter++,
      path: [...(basePathForGame as any[]), s],
      node: { ...stageNode, elements: flatElements },
      kind: 'game',
      name: stageNode?.name,
    });
  }

  // Exit sequence (each item is step-like with elements; ensure elements are flattened)
  for (let s = 0; s < flatExitSteps.length; s++) {
    const stepNode = flatExitSteps[s];
    const flatElements = flattenArrayWithTemplates(safeArray(stepNode?.elements), 'elements', templateMap);
    stages.push({
      stageIndex: stageCounter++,
      path: [...(basePathForExit as any[]), s],
      node: { ...stepNode, elements: flatElements },
      kind: 'exit',
      name: stepNode?.name,
    });
  }

  return stages;
}

// ------------------------------ Collect inits & refs from stages ------------------------------

function collectInitsAndRefsFromStages(
  stages: StageDescriptor[],
): { inits: Map<string, InitOccurrence>; refs: RefOccurrence[] } {
  const inits = new Map<string, InitOccurrence>();
  const refs: RefOccurrence[] = [];

  for (const st of stages) {
    if (!hasElementsArray(st.node)) continue;
    const elements = st.node.elements as any[];

    for (let eIdx = 0; eIdx < elements.length; eIdx++) {
      const el = elements[eIdx];

      // Initialization: element has type in CHECKED_TYPES and a concrete name
      if (CHECKED_TYPES.includes(el?.type) && typeof el?.name === 'string' && el.name.trim()) {
        const key: RefKey = { type: el.type, name: el.name.trim() } as RefKey;
        const mapKey = `${key.type}::${key.name}`;
        if (!inits.has(mapKey)) {
          inits.set(mapKey, {
            key,
            stageIndex: st.stageIndex,
            path: [...st.path, 'elements', eIdx, 'name'],
          });
        }
      }

      // References: only properties literally named `reference`
      if (typeof el?.reference === 'string') {
        const { key, dynamic } = parseReferenceString(el.reference);
        if (key) {
          refs.push({
            key,
            stageIndex: st.stageIndex,
            path: [...st.path, 'elements', eIdx, 'reference'],
            raw: el.reference,
            dynamic
          });
        }
      }

      // Also look inside element.conditions[].reference
      if (Array.isArray(el?.conditions)) {
        for (let cIdx = 0; cIdx < el.conditions.length; cIdx++) {
          const cond = el.conditions[cIdx];
          if (typeof cond?.reference === 'string') {
            const { key, dynamic } = parseReferenceString(cond.reference);
            if (key) {
              refs.push({
                key,
                stageIndex: st.stageIndex,
                path: [...st.path, 'elements', eIdx, 'conditions', cIdx, 'reference'],
                raw: cond.reference,
                dynamic
              });
            }
          }
        }
      }
    }
  }

  return { inits, refs };
}

// ------------------------------ Main check ------------------------------

export function runReferenceStageOrderChecks(
  document: vscode.TextDocument,
  parsedDoc: YAML.Document.Parsed,
  root: any,
  diagnostics: vscode.Diagnostic[]
) {
  try {
    const templateMap = buildTemplateMap(root);
    const treatments = safeArray(root?.treatments);

    // (A) Collect ALL top-level intro stages once; these always occur before treatments.
    const globalIntroStages = collectIntroStages(root, templateMap);
    const globalIntroIR = collectInitsAndRefsFromStages(globalIntroStages);

    for (let tIdx = 0; tIdx < treatments.length; tIdx++) {
      // (B) Collect template-provided intros for THIS treatment (if any)
      const tplIntroStages = collectTemplateIntroStagesForTreatment(root, tIdx, templateMap);

      // (C) Collect this treatment's game/exit stages (inline or via template)
      const bodyStages = collectBodyStagesForTreatment(root, tIdx, templateMap);

      // (D) Offset and combine: globalIntros → tplIntros → body
      let offset = 0;
      const globalIntroStagesOff = globalIntroStages.map(st => ({ ...st, stageIndex: st.stageIndex + offset }));
      offset += globalIntroStagesOff.length;

      const tplIntroStagesOff = tplIntroStages.map(st => ({ ...st, stageIndex: st.stageIndex + offset }));
      offset += tplIntroStagesOff.length;

      const bodyStagesOff = bodyStages.map(st => ({ ...st, stageIndex: st.stageIndex + offset }));

      // (E) Collect inits/refs per segment
      const tplIntroIR = collectInitsAndRefsFromStages(tplIntroStagesOff);
      const bodyIR = collectInitsAndRefsFromStages(bodyStagesOff);

      // (F) Merge inits preferring earliest stageIndex
      const inits = new Map<string, InitOccurrence>(globalIntroIR.inits);
      for (const [k, occ] of tplIntroIR.inits.entries()) {
        if (!inits.has(k) || occ.stageIndex < inits.get(k)!.stageIndex) inits.set(k, occ);
      }
      for (const [k, occ] of bodyIR.inits.entries()) {
        if (!inits.has(k) || occ.stageIndex < inits.get(k)!.stageIndex) inits.set(k, occ);
      }

      // (G) Merge refs
      const refs: RefOccurrence[] = [
        ...globalIntroIR.refs,
        ...tplIntroIR.refs,
        ...bodyIR.refs,
      ];

      // (H) Validate
      for (const ref of refs) {
        if (ref.dynamic) continue; // skip prompt.${...}, etc.

        const k = `${ref.key.type}::${ref.key.name}`;
        const init = inits.get(k);

        if (!init) {
          const pos = findPositionFromPath(ref.path, parsedDoc, document);
          if (pos) {
            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(pos.start, pos.end ?? pos.start),
              `Reference "${ref.raw}" must be initialized by a ${ref.key.type} with name "${ref.key.name}" earlier in the intro/template-intro/game/exit timeline.`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
          continue;
        }

        if (ref.stageIndex < init.stageIndex) {
          const pos = findPositionFromPath(ref.path, parsedDoc, document);
          if (pos) {
            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(pos.start, pos.end ?? pos.start),
              `Reference "${ref.raw}" appears before its ${ref.key.type} "${ref.key.name}" is initialized (init stage ${init.stageIndex}, found at stage ${ref.stageIndex}).`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
      }
    }
  } catch {
    // fail-safe: never crash diagnostics
  }
}


// YAML validator for treatments

export async function parseYaml(document: vscode.TextDocument) {
    // console.log("Processing .treatments.yaml file...");
    const diagnostics: vscode.Diagnostic[] = [];

    //Parse YAML content into AST
    let parsedData = YAML.parseDocument(document.getText(), {
        keepCstNodes: true,
        keepNodeTypes: true,
    } as any) || null;
    // console.log("YAML parsed successfully.");
    // console.log(parsedData.errors);

    if (parsedData.errors.length > 0) {
        // console.log("YAML parsing errors found:", parsedData.errors);
        parsedData.errors.forEach((error: any) => {
            const range = new vscode.Range(
                new vscode.Position(error.linePos[0].line - 2, 0),
                new vscode.Position(error.linePos[0].line + 2, 10)
            );
            if (error.code === 'BAD_INDENT' || error.code === 'MISSING_CHAR' ||
                error.code === 'BLOCK_AS_IMPLICIT_KEY' || error.code === 'MULTILINE_IMPLICIT_KEY') {
                diagnostics.push(
                    new vscode.Diagnostic(
                        range,
                        `YAML syntax error: ${error.code} -> ${error.message}; Check for proper indentation and formatting at lines or at nearby lines. Check arrays elements have dashes (-) in front of them.`,
                        vscode.DiagnosticSeverity.Error
                    )
                );
            }
        });
        diagnosticCollection.set(document.uri, diagnostics);
        // console.log("Length of diagnostics for yaml: " + diagnostics.length);
        // console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
        return;
    } else if (parsedData.warnings) {
        // console.log("YAML parsing warnings found:", parsedData.warnings);
        parsedData.warnings.forEach((warning: any) => {
            const range = new vscode.Range(
                offsetToPosition(warning.pos?.[0], document),
                offsetToPosition(warning.pos?.[1], document)
            );
            diagnostics.push(
                new vscode.Diagnostic(
                    range,
                    `YAML syntax warning: ${warning.code} -> ${warning.message}`,
                    vscode.DiagnosticSeverity.Warning
                )
            );
        });
    }

    // Check if the YAML document is empty
    if (
        !parsedData.contents ||
        (Array.isArray(parsedData.contents) &&
            parsedData.contents.length === 0)
    ) {
        // console.log("YAML document is empty. Skipping validation.");
        diagnosticCollection.set(document.uri, diagnostics); // Clear any existing diagnostics
        return;
    }

    // Validate YAML content using Zod and TreatmentFileType
    // console.log("Running Zod validation...");
    const validationResult = treatmentFileSchema.safeParse(
        parsedData.toJS() as TreatmentFileType
    );


    if (!validationResult.success) {
        // console.log("Zod validation failed:", validationResult.error.issues);
        (validationResult.error as ZodError).issues.forEach(
            (issue: ZodIssue) => {
                handleError(issue, parsedData, document, diagnostics);
            }
        );

        diagnosticCollection.set(document.uri, diagnostics);
    } else {
        //     console.log(
        //         "Zod validation passed. Types are consistent with TreatmentFileType."
        //     );
    }

    async function existence(parentUri: vscode.Uri, uri: vscode.Uri): Promise<{ uri: vscode.Uri; exists: boolean }> {
        try {
            await vscode.workspace.fs.stat(uri);
            return {
                uri: uri,
                exists: true
            };
        } catch (err) {
            if ((err as any).code === 'FileNotFound' || (err as any).name === 'EntryNotFound') {
                return {
                    uri: parentUri,
                    exists: false
                };
            }
            throw err;
        }
    }
    async function fileExistsInWorkspace(relativePath: string): Promise<{ uri: vscode.Uri; exists: boolean }> {
        try {
            const fileConfigUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'dlconfig.json');
            // console.log("Checking if dlconfig.json exists in workspace");
            await vscode.workspace.fs.stat(fileConfigUri);
            const fileData = await vscode.workspace.fs.readFile(fileConfigUri);
            const fileContent = new TextDecoder('utf-8').decode(fileData);
            const json = JSON.parse(fileContent);
            let fileUri: vscode.Uri;
            if (json?.experimentRoot && json.experimentRoot !== "") {
                const fileParentUri = vscode.Uri.joinPath(
                    vscode.workspace.workspaceFolders![0].uri,
                    json.experimentRoot
                );
                fileUri = vscode.Uri.joinPath(
                    vscode.workspace.workspaceFolders![0].uri,
                    json.experimentRoot,
                    relativePath
                );
                return await existence(fileParentUri, fileUri);
            }
            fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, relativePath);
            return await existence(vscode.workspace.workspaceFolders![0].uri, fileUri);
        } catch (err) {
            console.error("dlconfig.json does not exist", err);
            const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, relativePath);
            // console.log("Checking if file exists in workspace:", fileUri.toString());
            return await existence(vscode.workspace.workspaceFolders![0].uri, fileUri);
        }
    }

    async function asyncValidateFilesToIssues(
        data: unknown
    ): Promise<ZodIssue[]> {
        const issues: ZodIssue[] = [];

        async function recurse(
            node: unknown,
            path: (string | number)[] = []
        ): Promise<void> {
            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) {
                    await recurse(node[i], [...path, i]);
                }
            } else if (typeof node === "object" && node !== null) {
                for (const key of Object.keys(node)) {
                    const value = (node as any)[key];
                    const currentPath = [...path, key];

                    if (key === "file" && typeof value === "string") {
                        const data = await fileExistsInWorkspace(value);
                        if (!data.exists) {
                            issues.push({
                                code: z.ZodIssueCode.custom,
                                path: currentPath,
                                message: `File "${value}" does not exist in the workspace. Make sure "${value}" is located in and is written relative to "${data.uri}"`,
                            });
                        }
                    }

                    await recurse(value, currentPath);
                }
            }
        }

        await recurse(data);

        //   console.log("Validation issues found:", issues);
        return issues;
    }

    runReferenceStageOrderChecks(document, parsedData, parsedData.toJS(), diagnostics);

    const missingFiles = asyncValidateFilesToIssues(
        parsedData.toJS() as TreatmentFileType
    ).then((issues: ZodIssue[]) => {
        // console.log("Missing files validation issues:", issues);
        issues.forEach((issue: ZodIssue) => {
            handleError(issue, parsedData, document, diagnostics);
        });
        // Update diagnostics in VS Code
        diagnosticCollection.set(document.uri, diagnostics);
        // console.log("Length of diagnostics for yaml: " + diagnostics.length);
        // console.log("Length of diagnostic collection for yaml: " + diagnosticCollection.get(document.uri)!!.length);
    });


    const referenceTypeMap: Record<string, { name: string; line: number }[]> = {};
    const referenceChecks: { type: string; line: number; fullRef: string }[] = [];

    referenceTypeMap['discussion'] = [
        { name: "text", line: 0 },
        { name: "audio", line: 0 },
        { name: "video", line: 0 }
    ];

    referenceTypeMap['connectionInfo'] = [
        { name: "country", line: 0 },
        { name: "timezone", line: 0 },
        { name: "isKnownVpn", line: 0 },
        { name: "timezoneOffset", line: 0 },
        { name: "isLikelyVpn", line: 0 },
        { name: "effectiveType", line: 0 },
        { name: "saveData", line: 0 },
        { name: "downlink", line: 0 },
        { name: "rtt", line: 0 }
    ];

    function walkYaml(node: any, path: (string | number)[] = []) {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach((item, idx) => walkYaml(item, [...path, idx]));
        } else if (typeof node === 'object') {
            // Only track elements of type "survey" for now
            // if (node.type === 'survey' && typeof node.name === 'string') {
            //     // Find the path to the 'name' property
            //     const namePath = [...path, 'name'];
            //     const range = findPositionFromPath(namePath, parsedData, document);
            //     // Default to line 1 if range is not found
            //     const line = range ? range.start.line + 1 : 1;
            //     if (!referenceTypeMap['survey']) {
            //         referenceTypeMap['survey'] = [];
            //     }
            //     referenceTypeMap['survey'].push({ name: node.name, line });
            // }
            // if (node.type === 'prompt' && typeof node.name === 'string') {
            //     // Find the path to the 'name' property
            //     const namePath = [...path, 'name'];
            //     const range = findPositionFromPath(namePath, parsedData, document);
            //     // Default to line 1 if range is not found
            //     const line = range ? range.start.line + 1 : 1;
            //     if (!referenceTypeMap['prompt']) {
            //         referenceTypeMap['prompt'] = [];
            //     }
            //     referenceTypeMap['prompt'].push({ name: node.name, line });
            // }
            // if (node.type === 'submitButton' && typeof node.name === 'string') {
            //     // Find the path to the 'name' property
            //     const namePath = [...path, 'name'];
            //     const range = findPositionFromPath(namePath, parsedData, document);
            //     // Default to line 1 if range is not found
            //     const line = range ? range.start.line + 1 : 1;
            //     if (!referenceTypeMap['submitButton']) {
            //         referenceTypeMap['submitButton'] = [];
            //     }
            //     referenceTypeMap['submitButton'].push({ name: node.name, line });
            // }
            // Track references for any type (future extensibility)
            if (typeof node.reference === 'string' && node.reference.includes('.')) {
                const refPath = [...path, 'reference'];
                const range = findPositionFromPath(refPath, parsedData, document);
                const line = range ? range.start.line + 1 : 1;
                const [type] = node.reference.split('.', 1);
                referenceChecks.push({ type, line, fullRef: node.reference});
            }
            Object.entries(node)?.forEach(([key, value]) => {
                walkYaml(value, [...path, key]);
            });
        }
    }

    // Walk the parsed YAML
    walkYaml(parsedData.toJS({ keepCstNodes: true }));

    // Now check references for each type
    referenceChecks.forEach(({ type, line, fullRef }) => {
        // if (type === 'survey') {
        //     // Only 'survey' type is currently supported
        //     const name = fullRef.split('.', 2)[1];
        //     if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
        //         diagnostics.push(
        //             new vscode.Diagnostic(
        //                 new vscode.Range(
        //                     new vscode.Position(line, 0),
        //                     new vscode.Position(line, 100)
        //                 ),
        //                 `Reference "${fullRef}" does not match any previously defined ${type} element name.`,
        //                 vscode.DiagnosticSeverity.Warning
        //             )
        //         );
        //     }
        // }
        if (type === 'discussion') {
            // Only 'discussion' type is currently supported
            const name = fullRef.split('.', 2)[1];
            if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(line, 0),
                            new vscode.Position(line, 100)
                        ),
                        `Reference "${fullRef}" does not match audio, type, or video for defined ${type} element name.`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }
        if (type === 'connectionInfo') {
            // Only 'connectionInfo' type is currently supported
            const name = fullRef.split('.', 2)[1];
            if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
                diagnostics.push(
                    new vscode.Diagnostic(
                        new vscode.Range(
                            new vscode.Position(line, 0),
                            new vscode.Position(line, 100)
                        ),
                        `Reference "${fullRef}" does not match any defined ${type} element name.`,
                        vscode.DiagnosticSeverity.Warning
                    )
                );
            }
        }
        // if (type === 'prompt') {
        //     // Only 'prompt' type is currently supported
        //     const name = fullRef.split('.', 2)[1];
        //     if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
        //         diagnostics.push(
        //             new vscode.Diagnostic(
        //                 new vscode.Range(
        //                     new vscode.Position(line, 0),
        //                     new vscode.Position(line, 100)
        //                 ),
        //                 `Reference "${fullRef}" does not match any previously defined ${type} element name.`,
        //                 vscode.DiagnosticSeverity.Warning
        //             )
        //         );
        //     }
        // }
        // if (type === 'submitButton') {
        //     // Only 'submitButton' type is currently supported
        //     const name = fullRef.split('.', 2)[1];
        //     if (!(referenceTypeMap[type]?.some(entry => entry.name === name && entry.line < line))) {
        //         diagnostics.push(
        //             new vscode.Diagnostic(
        //                 new vscode.Range(
        //                     new vscode.Position(line, 0),
        //                     new vscode
        //                         .Position(line, 100)
        //                 ),
        //                 `Reference "${fullRef}" does not match any previously defined ${type} element name.`,
        //                 vscode.DiagnosticSeverity.Warning
        //             )
        //         );
        //     }
        // }
    });




}