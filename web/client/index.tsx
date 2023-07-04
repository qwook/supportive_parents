import { createRoot } from "react-dom/client";
import _ from "lodash";
import "./style.scss";
import React from "react";
import App from "./App";

// import "./tfjsCamera"

const root = createRoot(document.getElementById("app"));
root.render(
  // <React.StrictMode>
  <>
    <App />
  </>
  // </React.StrictMode>
);
