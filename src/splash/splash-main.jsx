import React from "react";
import { createRoot } from "react-dom/client";
import Splash from "./Splash.jsx";

/**
 * Entry point for the SPLASH renderer only.
 * This is a separate Vite entry from your main app's index.html/main.jsx —
 * see vite.config.js notes in the integration guide for the
 * multi-page build setup this requires.
 */
const container = document.getElementById("splash-root");
const root = createRoot(container);
root.render(<Splash />);
