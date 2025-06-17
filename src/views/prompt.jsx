import {
  usePlayer,
  useGame,
  useStageTimer,
} from "@empirica/core/player/classic/react";
import React from "react";
import { load as loadYaml } from "js-yaml";

// special paths for this specific location
import { Markdown } from "../../deliberation-empirica/client/src/components/Markdown";
import { RadioGroup } from "../../deliberation-empirica/client/src/components/RadioGroup";
import { CheckboxGroup } from "../../deliberation-empirica/client/src/components/CheckboxGroup";
import { TextArea } from "../../deliberation-empirica/client/src/components/TextArea";
import { useText, usePermalink } from "../../deliberation-empirica/client/src/components/hooks";
import { SharedNotepad } from "../../deliberation-empirica/client/src/components/SharedNotepad";
import { ListSorter } from "../../deliberation-empirica/client/src/components/ListSorter";

export function Prompt({ file, name, shared }) {

  const player = usePlayer();
  console.log("Player", player);
  const game = useGame();
  console.log("Game", game);
  const stageTimer = useStageTimer();

  // const progressLabel = "hardcoded progress label";
  const progressLabel = player.get("progressLabel");
  // const { text: promptString, error: fetchError } = useText({ file });
  // const permalink = usePermalink(file);
  const promptString = file;
  const fetchError = null;
  console.log("Text as file", promptString);
  const permalink = "hardcoded permalink (temporary)";
  const [responses, setResponses] = React.useState([]);

  if (fetchError) {
    return <p>Error loading prompt, retrying...</p>;
  }
  if (!promptString) return <p>Loading prompt...</p>;

  // Parse the prompt string into its sections
  const sectionRegex = /---\n/g;
  const [, metaDataString, prompt, responseString] =
    promptString.split(/^-{3,}$/gm);

  const metaData = loadYaml(metaDataString);
  const promptType = metaData?.type;

  // name is hardcoded as "example"
  const promptName = name || `${progressLabel}_${metaData?.name || file}`;
  const rows = metaData?.rows || 5;

  console.log("Prompt string properly parsed", promptString);

  // added trim to fix with whitespace lines?
  if (promptType !== "noResponse" && !responses.length && responseString.trim() !== '') {

    // fix with whitespace lines
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

  const record = {
    ...metaData,
    permalink, // TODO: test permalink in cypress
    name: promptName,
    shared,
    step: progressLabel,
    prompt,
    responses,
  };

  console.log("Reached before get call");

  // undefined on player.set ... maybe we check usePlayer()

  // Coordinate saving the data
  const saveData = (newValue) => {
    record.value = newValue;
    const stageElapsed = (stageTimer?.elapsed || 0) / 1000;
    record.stageTimeElapsed = stageElapsed;

    if (shared) {
      game.set(`prompt_${promptName}`, record);
      console.log(
        `Save game.set(prompt_${promptName}`,
        game.get(`prompt_${promptName}`)
      );
    } else {
      player.set(`prompt_${promptName}`, record);
    }
  };

  // const value = "hardcoded value";
  // this throws get error
  const value = shared
    ? game.get(`prompt_${promptName}`)?.value
    : player.get(`prompt_${promptName}`)?.value;

  // openResponse: loading... etherpad and shared notepad undefined
  // Etherpad Client URL defined
  // SharedNotepad: example_undefined

  return (
    <>
      <Markdown text={prompt} />
      {promptType === "multipleChoice" &&
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
      )}
    </>
  );
}
