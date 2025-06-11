import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// This is where the prompt gets imported from
import { Prompt } from "./prompt";
// import { Prompt } from "../../deliberation-empirica/client/src/elements/Prompt";

const vscode = acquireVsCodeApi();

function App() {
  const [props, setProps] = useState(null);

  useEffect(() => {
    console.log("Use effect");
    const handler = (event) => {
      const { type, promptProps } = event.data;
      console.log("Prompt props in use effect", promptProps);
      if (type === "init") {
        setProps(promptProps);
        console.log("Props after setting", props);
      }
    };

    console.log("Props from use effect", props);

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  console.log("Props", props);

  if (!props) {
    return <p>Loading...</p>;
  }

  return <Prompt {...props} />;
}

// Mount Prompt component
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);

  if (!rootElement) {
    console.error("No #root element found in DOM!");
  }

  console.log("Root is created in index.jsx");

  // rendering prompt
  root.render(
    <App />);

  // Lets extension know that webview is ready to receive prompts
  window.addEventListener("DOMContentLoaded", () => {
    console.log("Webview DOM loaded, posting ready message to extension host");
    // Send a "ready" signal back to the extension host
    vscode.postMessage({ type: "ready" }, "*");
  });
}
