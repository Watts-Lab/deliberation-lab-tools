import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// This is where the prompt gets imported from
// import { Prompt } from "./prompt";
import { Prompt } from "../../deliberation-empirica/client/src/elements/Prompt";

import { StageProvider } from "./stageContext";

import "../../deliberation-empirica/client/src/baseStyles.css";

import "./styles.css";

const vscode = acquireVsCodeApi();

// App only programmed to render Prompt at the moment
function App() {
  const [props, setProps] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const { type, promptProps } = event.data;
      if (type === "init") {
        setProps(promptProps);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (!props) {
    return <p>Error with input. Please check that given document is valid.</p>;
  }

  try {
    return <Prompt {...props} />;
  } catch (e) {
    console.log("Error on rendering prompt");
    return <p>Error when rendering prompt. Please check that there are no errors in prompt Markdown file</p>;
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
