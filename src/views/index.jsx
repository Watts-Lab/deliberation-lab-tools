import React, { useEffect, useState, useContext } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

// Importing React components from deliberation-empirica
import { Prompt } from "../../deliberation-empirica/client/src/elements/Prompt";
import { Button } from "../../deliberation-empirica/client/src/components/Button";
import { Stage } from "../../deliberation-empirica/client/src/Stage";
import { StageFrame } from "./StageFrame";

import { StageContext, StageProvider } from "./stageContext";

import "../../deliberation-empirica/client/src/baseStyles.css";
import "./styles.css";

export const vscode = acquireVsCodeApi();

// I'd maybe consider making a new file just for different error messaging?
function fallbackRender({ error, resetErrorBoundary }) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  console.log("Error in fallback render", error.message);
  const errorMetadataFormat = `
  ---
  name:
  type: [openResponse, multipleChoice, noResponse, listSorter]
  ---

  Prompt text

  ---

  Response text`;

  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.name}</pre>
      <pre style={{ color: "red" }}>{error.message}</pre>
      <p>Please check that formatting of prompt document is as follows:</p>
      <pre>{errorMetadataFormat}</pre>
      <Button handleClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

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
      // Check if this is called when there's an error on-screen
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
      console.log("Rendering stage with index", currentStageIndex);
      return <StageFrame />;
    } catch (e) {
      console.log("Error on rendering stage");
      return (<>
        <p>{e.name}</p>
        <p>{e.message}</p>
        <p>Error when rendering stage.</p>
      </>);
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
      <ErrorBoundary fallbackRender={fallbackRender} resetKeys={[prompt]}>
        {/* fallback={<p>Something went wrong</p>}
        fallbackRender={fallbackRender}
 onReset={(details) => {
    // Reset the state of your app so the error doesn't happen again
  }} */}
        <StageProvider>
          <App />
        </StageProvider>
      </ErrorBoundary>
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
