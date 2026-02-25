#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;

use tauri::{Manager, PhysicalPosition, PhysicalSize};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Create or get the main window with proper initial position
            let window = app.get_webview_window("main");
            
            if let Some(win) = window {
                // Position window in top-right corner
                if let Ok(Some(monitor)) = win.primary_monitor() {
                    let scale = monitor.scale_factor();
                    let screen_size = monitor.size();
                    let screen_pos = monitor.position();
                    
                    let win_width: u32 = 420;
                    let margin: u32 = 8;
                    
                    let screen_w_logical = (screen_size.width as f64 / scale) as i32;
                    
                    let x = screen_pos.x + (screen_w_logical - win_width as i32 - margin as i32);
                    let y = screen_pos.y + margin as i32;
                    
                    let _ = win.set_position(tauri::Position::Physical(PhysicalPosition { x, y }));
                }
                
                // Hide window initially - only show when tray is clicked
                win.hide().unwrap();
            }
            
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
            commands::summarize_entries,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
