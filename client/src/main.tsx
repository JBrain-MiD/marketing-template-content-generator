import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { StoreProvider } from "@/lib/store";

createRoot(document.getElementById("root")!).render(
  <StoreProvider>
    <App />
  </StoreProvider>
);
