import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

type TodoItem = {
  path: string;
  id: string;
  text: string;
  linked_note: string;
  status: "pending" | "done" | "cancelled";
  priority?: string | null;
  due?: string | null;
  created?: string | null;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadTodos() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `<div style="padding:12px;font-family:system-ui;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <h3 style="margin:0;">Todos</h3>
      <button id="refresh">Refresh</button>
    </div>
    <div id="list" style="margin-top:12px;">Loading…</div>
  </div>`;

  document.getElementById("refresh")?.addEventListener("click", () => render());

  async function render() {
    const list = document.getElementById("list");
    if (!list) return;

    try {
      const todos = (await invoke("list_todos")) as TodoItem[];

      if (!todos.length) {
        list.innerHTML = `<div style="opacity:0.7;">No open todos.</div>`;
        return;
      }

      list.innerHTML = todos
        .map((t) => {
          const meta = [t.priority ? `prio: ${t.priority}` : null, t.due ? `due: ${t.due}` : null]
            .filter(Boolean)
            .join(" · ");
          return `
          <div style="display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:10px;">
            <input type="checkbox" data-path="${escapeHtml(t.path)}" ${t.status === "done" ? "checked" : ""} />
            <div style="flex:1;">
              <div style="font-weight:600;">${escapeHtml(t.text)}</div>
              <div style="opacity:0.7;font-size:12px;">${escapeHtml(meta || t.linked_note)}</div>
              <div style="margin-top:6px;display:flex;gap:8px;">
                <button data-open="${escapeHtml(t.linked_note)}">Open note</button>
                <button data-cancel="${escapeHtml(t.path)}">Cancel</button>
              </div>
            </div>
          </div>`;
        })
        .join("\n");

      // wire events
      list.querySelectorAll("input[type=checkbox]").forEach((el) => {
        el.addEventListener("change", async (e) => {
          const target = e.target as HTMLInputElement;
          const path = target.getAttribute("data-path");
          if (!path) return;
          const status = target.checked ? "done" : "pending";
          await invoke("set_todo_status", { path, status });
          await render();
        });
      });

      list.querySelectorAll("button[data-open]").forEach((el) => {
        el.addEventListener("click", async (e) => {
          const btn = e.target as HTMLButtonElement;
          const linked_note = btn.getAttribute("data-open");
          if (!linked_note) return;
          await invoke("open_linked_note", { linked_note });
        });
      });

      list.querySelectorAll("button[data-cancel]").forEach((el) => {
        el.addEventListener("click", async (e) => {
          const btn = e.target as HTMLButtonElement;
          const path = btn.getAttribute("data-cancel");
          if (!path) return;
          await invoke("set_todo_status", { path, status: "cancelled" });
          await render();
        });
      });
    } catch (err: any) {
      list.innerHTML = `<div style="color:#ff8080;">Failed to load todos: ${escapeHtml(String(err))}</div>`;
    }
  }

  await render();
}

// Escape hides window
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    getCurrentWindow().hide();
  }
});

document.addEventListener("DOMContentLoaded", loadTodos);
