import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./routes";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/catalog.css";
import "./styles/enquiry.css";
import "./styles/quotation-response.css";
import "./styles/workspace.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element in index.html");
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
