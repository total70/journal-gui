use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> TrayIconBuilder<R> {
    // Create menu items
    let new_note = MenuItem::with_id(app, "new_note", "✍️ New Note", true, None::<&str>);
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

fn position_window_top_right<R: Runtime>(window: &tauri::WebviewWindow<R>) {
    // Position window in the top-right corner of the primary monitor
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let scale = monitor.scale_factor();
        let screen_size = monitor.size();
        let screen_pos = monitor.position();

        // Window size in logical pixels
        let win_width: u32 = 420;
        let _win_height: u32 = 280;
        let margin: u32 = 8;

        // Convert screen size to logical pixels
        let screen_w_logical = (screen_size.width as f64 / scale) as u32;

        // Top-right: x = screen right - window width - margin, y = margin
        let x = screen_pos.x + (screen_w_logical - win_width - margin) as i32;
        let y = screen_pos.y + margin as i32;

        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x: x as f64,
            y: y as f64,
        }));
    }
}

fn toggle_window<R: Runtime>(app: &tauri::AppHandle<R>, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        if window.is_visible().unwrap_or(false) {
            window.hide().unwrap();
        } else {
            // Position top-right before showing
            if label == "main" {
                position_window_top_right(&window);
            }
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
