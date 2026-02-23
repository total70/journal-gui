import { invoke } from "@tauri-apps/api/core";

// Constructable Stylesheet for encapsulated styling
const styles = new CSSStyleSheet();
styles.replaceSync(`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--pico-card-background-color, #fff);
    overflow: hidden;
  }
  
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: var(--pico-primary-background, #2c3e50);
    color: var(--pico-primary-inverse, #fff);
  }
  
  .header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  
  .content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    background: var(--pico-card-background-color, #fff);
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--pico-muted-border-color, #e5e7eb);
    border-top-color: var(--pico-primary-background, #3498db);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .loading p {
    margin: 0;
    color: var(--pico-muted-color, #6b7280);
    font-size: 0.875rem;
  }
  
  .summary-text {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--pico-color, #374151);
    white-space: pre-wrap;
  }
  
  .summary-text h1,
  .summary-text h2,
  .summary-text h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
    color: var(--pico-color, #1f2937);
  }
  
  .summary-text ul,
  .summary-text ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .summary-text li {
    margin-bottom: 0.5rem;
  }
  
  .error {
    color: #dc2626;
    padding: 1rem;
    background: #fee2e2;
    border-radius: 8px;
    font-size: 0.875rem;
  }
  
  .empty {
    text-align: center;
    color: var(--pico-muted-color, #6b7280);
    padding: 2rem;
  }
`);

class SummaryView extends HTMLElement {
  private content: HTMLDivElement;
  private loading: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [styles];

    shadow.innerHTML = `
      <div class="header">
        <h2 id="title">Summary</h2>
      </div>
      <div class="content">
        <div class="loading" id="loading">
          <div class="spinner"></div>
          <p>Generating summary...</p>
        </div>
        <div class="summary-text" id="content" style="display: none;"></div>
      </div>
    `;

    this.content = shadow.getElementById("content")! as HTMLDivElement;
    this.loading = shadow.getElementById("loading")! as HTMLDivElement;

    // Get week parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const week = urlParams.get("week") === "true";
    const previousWeek = urlParams.get("previous_week") === "true";
    
    // Set title
    const title = shadow.getElementById("title")!;
    if (previousWeek) {
      title.textContent = "Previous Week Summary";
    } else if (week) {
      title.textContent = "Week Summary";
    } else {
      title.textContent = "Today Summary";
    }

    // Load summary
    this.loadSummary(week, previousWeek);
  }

  private async loadSummary(week: boolean, previousWeek: boolean = false) {
    try {
      console.log("DEBUG loadSummary: week=", week, "previousWeek=", previousWeek);
      const summary = await invoke("summarize_entries", { week, previous_week: previousWeek });
      
      this.loading.style.display = "none";
      this.content.style.display = "block";
      
      if (!summary || (summary as string).trim() === "") {
        this.content.innerHTML = `<div class="empty">No entries found for ${week ? "this week" : "today"}.</div>`;
      } else {
        // Convert markdown-like content to HTML
        const html = this.formatSummary(summary as string);
        this.content.innerHTML = html;
      }
    } catch (error) {
      this.loading.style.display = "none";
      this.content.style.display = "block";
      this.content.innerHTML = `<div class="error">Failed to generate summary: ${error}</div>`;
    }
  }

  private formatSummary(text: string): string {
    // Simple markdown-like formatting
    let formatted = text
      // Escape HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Bullet points
      .replace(/^\* (.*$)/gim, "<li>$1</li>")
      // Numbered lists
      .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
      // Line breaks
      .replace(/\n/g, "<br>");

    // Wrap consecutive li elements in ul
    formatted = formatted.replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>");
    // Fix nested ul
    formatted = formatted.replace(/<\/ul>\s*<ul>/g, "");

    return formatted;
  }
}

customElements.define("summary-view", SummaryView);
