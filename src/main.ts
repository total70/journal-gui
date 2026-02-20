import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./components/quick-note";

// Handle escape key to close window
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    getCurrentWindow().hide();
  }
});

// Check dependencies on load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const status = await invoke("check_dependencies") as { journal_ai: boolean; file_journal: boolean };
    
    if (!status.journal_ai || !status.file_journal) {
      const missing = [];
      if (!status.journal_ai) missing.push("journal-ai");
      if (!status.file_journal) missing.push("file-journal");
      
      console.error("Missing dependencies:", missing);
      
      // Show error in UI
      const app = document.getElementById("app");
      if (app) {
        app.innerHTML = `
          <div style="padding: 2rem; text-align: center;">
            <h3>Missing Dependencies</h3>
            <p>Please install: ${missing.join(", ")}</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        `;
      }
    }
  } catch (e) {
    console.error("Failed to check dependencies:", e);
  }
});
