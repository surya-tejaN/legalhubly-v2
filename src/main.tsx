import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Validate env before mounting — fail fast with a clear message
import "@/config/env";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(<App />);
