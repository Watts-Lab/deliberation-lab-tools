import React from "react";
import { load as loadYaml } from "js-yaml";
import { Markdown } from "../../deliberation-empirica/client/src/components/Markdown";
import { RadioGroup } from "../../deliberation-empirica/client/src/components/RadioGroup";
import { CheckboxGroup } from "../../deliberation-empirica/client/src/components/CheckboxGroup";
import { TextArea } from "../../deliberation-empirica/client/src/components/TextArea";
import { useText, usePermalink } from "../../deliberation-empirica/client/src/components/hooks";
import { SharedNotepad } from "../../deliberation-empirica/client/src/components/SharedNotepad";
import { ListSorter } from "../../deliberation-empirica/client/src/components/ListSorter";

// file will be a vscode.TextDocument
export function Prompt({ file, name, shared }) {

  // const { text: promptString, error: fetchError } = useText({ file });
//   const promptString = `---
// name: src/test/suite/fixtures/allTalk.md
// type: noResponse
// ---

// Please describe the chair you are sitting in.

// Everybody talk at once. Sometimes take pauses.

// ---
// `;
  // const permalink = usePermalink(file);

  // string from vscode.TextDocument

  const promptString = file;
  const [responses, setResponses] = React.useState([]);

  // Uncomment out if fetching is done?
//   if (fetchError) {
//     return <p>Error loading prompt, retrying...</p>;
//   }
  if (!promptString || promptString === undefined || typeof promptString !== 'string') {
    console.log("Prompt string undefined?", promptString === undefined, typeof promptString, promptString);
    return <p>Loading prompt...</p>;
  }

  // Parse the prompt string into its sections
  // const sectionRegex = /---\n/g;
  console.log("Before splitting prompt string ", promptString, typeof promptString);
  const [, metaDataString, prompt, responseString] =
    promptString?.split(/^-{3,}$/gm);

  console.log("Prompt string " + promptString);
  console.log("Meta data string" + metaDataString);
  console.log("Response string " + responseString);

  const metaData = loadYaml(metaDataString);
  const promptType = metaData?.type;
  console.log("Prompt type " + promptType);

  // comment out for now
  // const promptName = name || `${progressLabel}_${metaData?.name || file}`;
  const rows = metaData?.rows || 5;

  if (promptType !== "noResponse" && !responses.length) {
    const responseItems = responseString
      .split(/\r?\n|\r|\n/g)
      .filter((i) => i)
      .map((i) => i.substring(2));

    if (metaData?.shuffleOptions) {
      setResponses(responseItems.sort(() => 0.5 - Math.random())); // shuffle
    } else {
      setResponses(responseItems);
    }
  }

  console.log("Before prompt generation");
  console.log("Prompt" + prompt);
  console.log(<Markdown text={prompt} />);


  // Prompt is rendered but not Markdown
  return (
    <>
      <p> Prompt loaded?</p>
      <p>{prompt}</p>
      <Markdown text={prompt} />
      {/* {promptType === "multipleChoice" &&
        (metaData.select === "single" || metaData.select === undefined) && (
          <RadioGroup
            options={responses.map((choice) => ({
              key: choice,
              value: choice,
            }))}
            selected={value}
            onChange={(e) => saveData(e.target.value)}
            testId={metaData?.name}
          />
        )}

      {promptType === "multipleChoice" && metaData.select === "multiple" && (
        <CheckboxGroup
          options={responses.map((choice) => ({
            key: choice,
            value: choice,
          }))}
          selected={value}
          onChange={(newSelection) => saveData(newSelection)}
          testId={metaData?.name}
        />
      )}

      {promptType === "openResponse" && !shared && (
        <TextArea
          defaultText={responses.join("\n")}
          onChange={(e) => saveData(e.target.value)}
          value={value}
          testId={metaData?.name}
          rows={rows}
        />
      )}

      {promptType === "openResponse" && shared && (
        <SharedNotepad
          padName={promptName}
          defaultText={responses.join("\n")}
          record={record}
          arg="test"
          rows={rows}
        />
      )}

      {promptType === "listSorter" && (
        <ListSorter
          list={value || responses}
          onChange={(newOrder) => saveData(newOrder)}
          testId={metaData?.name}
        />
      )} */}
    </>
  );
}
