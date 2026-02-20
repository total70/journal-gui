import "./components/summary-view";

// Handle escape key to close window
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.close();
  }
});
