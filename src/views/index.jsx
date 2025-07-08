import React, { useEffect, useState, useContext } from "react";
import { createRoot } from "react-dom/client";

// This is where the prompt gets imported from
// import { Prompt } from "./prompt";
import { Prompt } from "../../deliberation-empirica/client/src/elements/Prompt";
import { Stage } from "../../deliberation-empirica/client/src/Stage";
// import { Stage } from "./Stage";

import { StageContext, StageProvider } from "./stageContext";

import "../../deliberation-empirica/client/src/baseStyles.css";
import "./styles.css";

export const vscode = acquireVsCodeApi();

// App only programmed to render Prompt at the moment
function App() {
  const [props, setProps] = useState(null);
  const [isStage, setStage] = useState(null);

  // TODO: possibly refactor all of this stage stuff into another index file specifically for the stage
  const {
    currentStageIndex,
    setCurrentStageIndex,
    elapsed,
    setElapsed,
    treatment,
    setTreatment,
    templatesMap,
    setTemplatesMap,
    refData,
    setRefData,
    selectedTreatmentIndex,
    setSelectedTreatmentIndex
  } = useContext(StageContext);

  useEffect(() => {
    const handler = (event) => {
      const { type, promptProps } = event.data;

      // TODO: refactor to switch case?
      if (type === "prompt") {
        setProps(promptProps);
      } else if (type === "init") { // TODO: can probably remove this "init"
        setStage(promptProps);
      } else if (type === "stage") {
        // need to loadyaml?
        console.log("Treatment before setting", treatment);
        console.log("Treatment props", promptProps);
        setTreatment(promptProps.file);
        console.log("Treatment after setting", treatment);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (props) {
    try {
      return <Prompt {...props} />;
    } catch (e) {
      console.log("Error on rendering prompt");
      return <p>Error when rendering prompt. Please check that there are no errors in prompt Markdown file</p>;
    }
  } else if (treatment) {
    try {
      console.log("Rendering stage");
      return <Stage />;
    } catch (e) {
      console.log("Error on rendering stage");
      return <p>Error when rendering stage.</p>;
    }
  }

  // If no props are yet set for either prompt or stage
  if (!props && !treatment) {
    return <p>Loading...</p>;
  }
}

// Mount Prompt component
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);

  if (!rootElement) {
    console.error("No #root element found in DOM!");
  }

  // Rendering prompt
  // Need StageProvider for stageContext and other mocks
  try {
    root.render(
      <StageProvider>
        <App />
      </StageProvider>
    );
  } catch (e) {
    console.log(e);
    root.render(
      <p>Error rendering file. Please check that file is correctly formatted.</p>
    )
  }

  // Lets extension know that webview is ready to receive prompts
  window.addEventListener("DOMContentLoaded", () => {
    console.log("Webview DOM loaded, posting ready message to extension host");
    // Send a "ready" signal back to the extension host
    vscode.postMessage({ type: "ready" }, "*");
  });
}
