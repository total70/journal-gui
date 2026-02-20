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
`);

class QuickNote extends HTMLElement {
  private textarea: HTMLTextAreaElement;
  private saveBtn: HTMLButtonElement;
  private charCount: HTMLSpanElement;
  private statusEl: HTMLDivElement | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [styles];

    shadow.innerHTML = `
      <div class="header">
        <h3>Quick Note</h3>
        <button class="close-btn" aria-label="Close">✕</button>
      </div>
      <div class="content">
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
    shadow.querySelector(".header")!.addEventListener("mousedown", (e) => this.startDrag(e));

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
      const result = await invoke("create_entry", { content });
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

  private startDrag(e: MouseEvent) {
    // Window dragging is handled by Tauri
    // This is a placeholder for custom drag behavior if needed
    const _ = e;
  }
}

customElements.define("quick-note", QuickNote);
