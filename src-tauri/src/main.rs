#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Get or create the main window
            let window = app.get_webview_window("main").unwrap();
            
            // Hide window initially - only show when tray is clicked
            window.hide().unwrap();

            // Setup tray
            let tray = tray::create_tray(app.handle());
            tray.build(app.handle())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            use tauri::WindowEvent;
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    // Hide instead of close
                    window.hide().unwrap();
                    api.prevent_close();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_entry,
            commands::check_dependencies,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
