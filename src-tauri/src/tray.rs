use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> TrayIconBuilder<R> {
    // Create menu items
    let new_note = MenuItem::with_id(app, "new_note", "New Note", true, None::<&str>);
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>);
    let separator = PredefinedMenuItem::separator(app).unwrap();

    // Create menu
    let menu = Menu::with_items(app, &[
        &new_note.unwrap(),
        &separator,
        &quit.unwrap(),
    ]).unwrap();

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let id = event.id.0.as_str();
            match id {
                "new_note" => {
                    toggle_window(app);
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, _event| {
            toggle_window(tray.app_handle());
        })
}

fn toggle_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide().unwrap();
        } else {
            window.show().unwrap();
            window.set_focus().unwrap();
            
            // Focus the textarea after showing
            let _ = window.eval(r#"
                const textarea = document.querySelector('textarea');
                if (textarea) textarea.focus();
            "#);
        }
    }
}
