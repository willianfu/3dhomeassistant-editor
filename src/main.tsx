import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const EDITOR_LOCAL_CONFIG_KEY = "3dhomeassistant.editor.config";

function getInitialTheme() {
  try {
    const raw = window.localStorage.getItem(EDITOR_LOCAL_CONFIG_KEY);
    if (!raw) {
      return "dark";
    }
    const parsed = JSON.parse(raw) as { appearance?: { theme?: unknown } };
    return parsed.appearance?.theme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const initialTheme = getInitialTheme();
document.documentElement.classList.toggle("dark", initialTheme === "dark");
document.documentElement.dataset.theme = initialTheme;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
