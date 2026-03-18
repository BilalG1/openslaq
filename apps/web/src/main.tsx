import * as Sentry from "@sentry/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 0,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
