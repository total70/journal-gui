import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Constructable Stylesheet for encapsulated styling
const styles = new CSSStyleSheet();
styles.replaceSync(`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--pico-card-background-color, #fff);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    position: relative;
  }
  
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--pico-primary-background, #2c3e50);
    color: var(--pico-primary-inverse, #fff);
    cursor: move;
    user-select: none;
  }
  
  .header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .close-btn {
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .close-btn:hover {
    opacity: 1;
  }
  
  .content {
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  textarea {
    flex: 1;
    resize: none;
    border: 1px solid var(--pico-form-element-border-color, #e5e7eb);
    border-radius: 8px;
    padding: 0.75rem;
    font-family: inherit;
    font-size: 0.9375rem;
    line-height: 1.5;
    background: var(--pico-form-element-background-color, #fff);
    color: var(--pico-color, #333);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  textarea:focus {
    outline: none;
    border-color: var(--pico-primary-border, #3498db);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
  
  textarea::placeholder {
    color: var(--pico-muted-color, #9ca3af);
  }
  
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  
  .char-count {
    font-size: 0.75rem;
    color: var(--pico-muted-color, #6b7280);
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }
  
  button.secondary {
    background: transparent;
    border-color: var(--pico-form-element-border-color, #e5e7eb);
    color: var(--pico-color, #333);
  }
  
  button.secondary:hover {
    background: var(--pico-muted-background-color, #f3f4f6);
  }
  
  button.primary {
    background: var(--pico-primary-background, #3498db);
    color: var(--pico-primary-inverse, #fff);
  }
  
  button.primary:hover {
    background: var(--pico-primary-hover-background, #2980b9);
  }
  
  button.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .status {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    animation: fadeOut 3s forwards;
    animation-delay: 2s;
  }
  
  .status.success {
    background: #d1fae5;
    color: #065f46;
  }
  
  .status.error {
    background: #fee2e2;
    color: #991b1b;
  }
  
  @keyframes fadeOut {
    to {
      opacity: 0;
      visibility: hidden;
    }
  }
  
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .menu-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--pico-muted-background-color, #f9fafb);
    border-bottom: 1px solid var(--pico-form-element-border-color, #e5e7eb);
  }
  
  .menu-bar button {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    background: transparent;
    border: 1px solid var(--pico-form-element-border-color, #e5e7eb);
    color: var(--pico-color, #374151);
  }
  
  .menu-bar button:hover {
    background: var(--pico-muted-background-color, #f3f4f6);
  }
  
  .summary-view {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    background: var(--pico-card-background-color, #fff);
  }
  
  .summary-view h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    color: var(--pico-color, #374151);
  }
  
  .summary-view .summary-text {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--pico-color, #4b5563);
    white-space: pre-wrap;
  }
  
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border-radius: 12px;
  }
  
  .loading-overlay .spinner {
    width: 32px;
    height: 32px;
    border-width: 3px;
    margin-bottom: 0.75rem;
  }
  
  .loading-overlay p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--pico-muted-color, #6b7280);
  }
`);

class QuickNote extends HTMLElement {
  private textarea: HTMLTextAreaElement;
  private saveBtn: HTMLButtonElement;
  private charCount: HTMLSpanElement;
  private statusEl: HTMLDivElement | null = null;
  private isLoading: boolean = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [styles];

    shadow.innerHTML = `
      <div class="header">
        <h3>Quick Note</h3>
        <button class="close-btn" aria-label="Close">✕</button>
      </div>
      <div class="menu-bar">
        <button id="summarize-today" title="Summarize today's entries">📊 Today</button>
        <button id="summarize-week" title="Summarize this week's entries">📅 Week</button>
      </div>
      <div class="content" id="editor-view">
        <textarea 
          placeholder="Write your note... (Ctrl+Enter to save)"
          rows="4"
        ></textarea>
        <div class="footer">
          <span class="char-count">0 chars</span>
          <div class="actions">
            <button class="secondary" id="cancel">Cancel</button>
            <button class="primary" id="save">Save</button>
          </div>
        </div>
      </div>
      <div class="summary-view" id="summary-view" style="display: none;">
        <h4>Summary</h4>
        <div class="summary-text">Loading...</div>
        <div class="footer" style="margin-top: 1rem;">
          <button class="secondary" id="back-to-editor">← Back</button>
        </div>
      </div>
      <div class="loading-overlay" id="loading-overlay" style="display: none;">
        <span class="spinner"></span>
        <p>Generating summary...</p>
      </div>
    `;

    this.textarea = shadow.querySelector("textarea")!;
    this.saveBtn = shadow.getElementById("save")! as HTMLButtonElement;
    this.charCount = shadow.querySelector(".char-count")!;

    // Event listeners
    this.textarea.addEventListener("input", () => this.updateCharCount());
    this.textarea.addEventListener("keydown", (e) => this.handleKeydown(e));
    
    shadow.getElementById("cancel")!.addEventListener("click", () => this.cancel());
    shadow.getElementById("save")!.addEventListener("click", () => this.save());
    shadow.querySelector(".close-btn")!.addEventListener("click", () => this.cancel());
    shadow.querySelector(".header")!.addEventListener("mousedown", (e: Event) => this.startDrag(e as MouseEvent));
    
    // Summary buttons
    shadow.getElementById("summarize-today")!.addEventListener("click", () => this.summarize(false));
    shadow.getElementById("summarize-week")!.addEventListener("click", () => this.summarize(true));
    shadow.getElementById("back-to-editor")!.addEventListener("click", () => this.showEditor());

    // Focus textarea on mount
    setTimeout(() => this.textarea.focus(), 100);
  }

  private updateCharCount() {
    const count = this.textarea.value.length;
    this.charCount.textContent = `${count} char${count !== 1 ? "s" : ""}`;
  }

  private handleKeydown(e: KeyboardEvent) {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      this.save();
    }
    // Escape to cancel
    if (e.key === "Escape") {
      this.cancel();
    }
  }

  private async save() {
    const content = this.textarea.value.trim();
    if (!content) {
      this.showStatus("Please enter a note", "error");
      return;
    }

    this.setLoading(true);

    try {
      await invoke("create_entry", { content });
      this.showStatus("Saved!", "success");
      
      // Clear and close after short delay
      setTimeout(() => {
        this.textarea.value = "";
        this.updateCharCount();
        this.closeWindow();
      }, 500);
    } catch (error) {
      this.showStatus(String(error), "error");
    } finally {
      this.setLoading(false);
    }
  }

  private cancel() {
    this.textarea.value = "";
    this.updateCharCount();
    this.closeWindow();
  }

  private closeWindow() {
    getCurrentWindow().hide();
  }

  private setLoading(loading: boolean) {
    this.saveBtn.disabled = loading;
    if (loading) {
      this.saveBtn.innerHTML = '<span class="spinner"></span>Saving...';
    } else {
      this.saveBtn.textContent = "Save";
    }
  }

  private showStatus(message: string, type: "success" | "error") {
    // Remove existing status
    if (this.statusEl) {
      this.statusEl.remove();
    }

    // Create new status
    this.statusEl = document.createElement("div");
    this.statusEl.className = `status ${type}`;
    this.statusEl.textContent = message;

    const footer = this.shadowRoot!.querySelector(".footer")!;
    footer.prepend(this.statusEl);

    // Auto-remove after animation
    setTimeout(() => {
      this.statusEl?.remove();
      this.statusEl = null;
    }, 5000);
  }

  private startDrag(_e: MouseEvent) {
    // Window dragging is handled by Tauri
    // This is a placeholder for custom drag behavior if needed
  }

  private async summarize(week: boolean) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const shadow = this.shadowRoot!;
    const loadingOverlay = shadow.getElementById("loading-overlay")!;
    const summaryView = shadow.getElementById("summary-view")!;
    const editorView = shadow.getElementById("editor-view")!;
    const summaryText = summaryView.querySelector(".summary-text")!;
    
    loadingOverlay.style.display = "flex";
    
    try {
      const summary = await invoke("summarize_entries", { week });
      summaryText.textContent = summary as string;
      
      editorView.style.display = "none";
      summaryView.style.display = "block";
    } catch (error) {
      summaryText.textContent = `Error: ${error}`;
      editorView.style.display = "none";
      summaryView.style.display = "block";
    } finally {
      loadingOverlay.style.display = "none";
      this.isLoading = false;
    }
  }

  private showEditor() {
    const shadow = this.shadowRoot!;
    const summaryView = shadow.getElementById("summary-view")!;
    const editorView = shadow.getElementById("editor-view")!;
    
    summaryView.style.display = "none";
    editorView.style.display = "block";
    this.textarea.focus();
  }
}

customElements.define("quick-note", QuickNote);
