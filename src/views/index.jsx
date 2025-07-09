import React, { useEffect, useState, useContext } from "react";
import { createRoot } from "react-dom/client";

// Importing React components from deliberation-empirica
import { Prompt } from "../../deliberation-empirica/client/src/elements/Prompt";
import { Stage } from "../../deliberation-empirica/client/src/Stage";
// import { Stage } from "./Stage";

import { StageContext, StageProvider } from "./stageContext";

import "../../deliberation-empirica/client/src/baseStyles.css";
import "./styles.css";

export const vscode = acquireVsCodeApi();

function App() {
  const [prompt, setPrompt] = useState(null);

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
      const { type, props } = event.data;

      // TODO: refactor to switch case?
      if (type === "prompt") {
        console.log("Prompt props", props);
        setPrompt(props);
        console.log("Prompt props after setting", prompt);
      } else if (type === "stage") {
        console.log("Treatment before setting", treatment);
        console.log("Treatment props", props);
        setTreatment(props);
        console.log("Treatment after setting", treatment);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (prompt) {
    try {
      console.log("Rendering prompt");
      return <Prompt {...prompt} />;
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
  if (!prompt && !treatment) {
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
