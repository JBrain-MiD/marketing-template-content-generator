import { createRoot } from "react-dom/client";
import App from "./App";
import SimplifiedApp from "./SimplifiedApp";
import "./index.css";
import { StoreProvider } from "@/lib/store";

// Toggle this to switch between regular and simplified app
const USE_SIMPLIFIED_APP = true;

if (USE_SIMPLIFIED_APP) {
  createRoot(document.getElementById("root")!).render(<SimplifiedApp />);
} else {
  createRoot(document.getElementById("root")!).render(
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
