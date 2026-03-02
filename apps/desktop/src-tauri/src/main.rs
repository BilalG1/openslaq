#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuBuilder, MenuItem, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

fn main() {
    let is_autostarted = std::env::args().any(|arg| arg == "--autostarted");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--autostarted"])
                .build(),
        )
        .setup(move |app| {
            // ── App menu bar ────────────────────────────────────────
            let preferences =
                MenuItem::with_id(app, "preferences", "Preferences...", true, Some("CmdOrCtrl+,"))?;

            let app_menu = SubmenuBuilder::new(app, "OpenSlaq")
                .about(None)
                .separator()
                .item(&preferences)
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // ── File ────────────────────────────────────────────────
            let new_message =
                MenuItem::with_id(app, "new-message", "New Message", true, None::<&str>)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_message)
                .separator()
                .close_window()
                .build()?;

            // ── Edit ────────────────────────────────────────────────
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // ── View ────────────────────────────────────────────────
            let zoom_in =
                MenuItem::with_id(app, "zoom-in", "Zoom In", true, Some("CmdOrCtrl+="))?;
            let zoom_out =
                MenuItem::with_id(app, "zoom-out", "Zoom Out", true, Some("CmdOrCtrl+-"))?;
            let actual_size = MenuItem::with_id(
                app,
                "actual-size",
                "Actual Size",
                true,
                Some("CmdOrCtrl+0"),
            )?;
            let toggle_sidebar =
                MenuItem::with_id(app, "toggle-sidebar", "Toggle Sidebar", true, None::<&str>)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&zoom_in)
                .item(&zoom_out)
                .item(&actual_size)
                .separator()
                .fullscreen()
                .separator()
                .item(&toggle_sidebar)
                .build()?;

            // ── Window ──────────────────────────────────────────────
            let bring_all_to_front = MenuItem::with_id(
                app,
                "bring-all-to-front",
                "Bring All to Front",
                true,
                None::<&str>,
            )?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .maximize()
                .separator()
                .item(&bring_all_to_front)
                .build()?;

            // ── Help ────────────────────────────────────────────────
            let keyboard_shortcuts = MenuItem::with_id(
                app,
                "keyboard-shortcuts",
                "Keyboard Shortcuts",
                true,
                None::<&str>,
            )?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .about(None)
                .item(&keyboard_shortcuts)
                .build()?;

            // ── Assemble & attach ───────────────────────────────────
            let menu_bar = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu_bar)?;

            // ── Tray icon (unchanged) ───────────────────────────────
            let show = MenuItem::with_id(app, "show", "Show OpenSlaq", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit OpenSlaq", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .tooltip("OpenSlaq")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            if is_autostarted {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // Deep-link: emit any URLs that launched the app (cold start)
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                if let Some(url) = urls.first() {
                    let _ = app.emit("deep-link:open", url.to_string());
                }
            }

            // Deep-link: handle URLs when app is already running (warm start)
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(url) = event.urls().first() {
                    // Focus/show the main window
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                    let _ = handle.emit("deep-link:open", url.to_string());
                }
            });

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "bring-all-to-front" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                // Forward all other custom menu items to the frontend
                "preferences" | "new-message" | "zoom-in" | "zoom-out" | "actual-size"
                | "toggle-sidebar" | "keyboard-shortcuts" => {
                    let event_name = format!("menu:{}", id);
                    let _ = app.emit(&event_name, ());
                }
                _ => {}
            }
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.app_handle().save_window_state(StateFlags::all());
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
