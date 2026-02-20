use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> TrayIconBuilder<R> {
    // Create menu items
    let new_note = MenuItem::with_id(app, "new_note", "New Note", true, None::<&str>);
    let summarize_today = MenuItem::with_id(app, "summarize_today", "📊 Today", true, None::<&str>);
    let summarize_week = MenuItem::with_id(app, "summarize_week", "📅 This Week", true, None::<&str>);
    let summarize_prev_week = MenuItem::with_id(app, "summarize_prev_week", "📰 Last Week", true, None::<&str>);
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>);
    let separator = PredefinedMenuItem::separator(app).unwrap();
    let separator2 = PredefinedMenuItem::separator(app).unwrap();

    // Create menu
    let menu = Menu::with_items(app, &[
        &new_note.unwrap(),
        &separator,
        &summarize_today.unwrap(),
        &summarize_week.unwrap(),
        &summarize_prev_week.unwrap(),
        &separator2,
        &quit.unwrap(),
    ]).unwrap();

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let id = event.id.0.as_str();
            match id {
                "new_note" => {
                    toggle_window(app, "main");
                }
                "summarize_today" => {
                    show_summary_window(app, "today");
                }
                "summarize_week" => {
                    show_summary_window(app, "week");
                }
                "summarize_prev_week" => {
                    show_summary_window(app, "prev_week");
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, _event| {
            toggle_window(tray.app_handle(), "main");
        })
}

fn toggle_window<R: Runtime>(app: &tauri::AppHandle<R>, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        if window.is_visible().unwrap_or(false) {
            window.hide().unwrap();
        } else {
            window.show().unwrap();
            window.set_focus().unwrap();
            
            // Focus the textarea after showing (only for main window)
            if label == "main" {
                let _ = window.eval(r#"
                    const textarea = document.querySelector('textarea');
                    if (textarea) textarea.focus();
                "#);
            }
        }
    }
}

fn show_summary_window<R: Runtime>(app: &tauri::AppHandle<R>, summary_type: &str) {
    let (label, title, url_param) = match summary_type {
        "week" => ("summary-week", "Week Summary", "week=true"),
        "prev_week" => ("summary-prev-week", "Previous Week Summary", "previous_week=true"),
        _ => ("summary-today", "Today Summary", "week=false"),
    };
    
    // Check if window already exists
    if let Some(window) = app.get_webview_window(label) {
        window.show().unwrap();
        window.set_focus().unwrap();
        return;
    }
    
    // Create new summary window
    let window = tauri::WebviewWindowBuilder::new(
        app,
        label,
        tauri::WebviewUrl::App(format!("/summary.html?{}", url_param).into())
    )
    .title(title)
    .inner_size(500.0, 400.0)
    .min_inner_size(400.0, 300.0)
    .center()
    .decorations(true)
    .skip_taskbar(false)
    .build()
    .unwrap();
    
    // Store the week parameter in window state
    window.set_title(title).unwrap();
}
