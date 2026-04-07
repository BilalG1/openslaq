#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuBuilder, MenuItem, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::WebviewWindowBuilder,
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

const LOCALHOST_PORT: u16 = 3334;
const AUTOMATION_PORT: u16 = 9199;

// ── Automation server (debug builds only) ──────────────────────────
// Exposes an HTTP server on AUTOMATION_PORT that accepts JSON commands
// and executes JavaScript in the webview. Used by the `dtk` CLI.

#[cfg(debug_assertions)]
mod automation {
    use serde::{Deserialize, Serialize};
    use std::sync::{Mutex, Condvar};
    use tauri::Manager;

    #[derive(Deserialize)]
    struct Command {
        action: String,
        #[serde(default)]
        args: Vec<serde_json::Value>,
    }

    #[derive(Serialize)]
    struct Response {
        ok: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        data: Option<serde_json::Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    }

    // Shared state for JS eval results
    static DTK_RESULT: std::sync::LazyLock<(Mutex<Option<String>>, Condvar)> =
        std::sync::LazyLock::new(|| (Mutex::new(None), Condvar::new()));

    /// Tauri IPC command called from JS to deliver eval results back to Rust.
    #[tauri::command]
    pub fn dtk_eval_result(payload: String) {
        let (lock, cvar) = &*DTK_RESULT;
        let mut guard = lock.lock().unwrap();
        *guard = Some(payload);
        cvar.notify_one();
    }

    pub fn start(app_handle: tauri::AppHandle, port: u16) {
        std::thread::spawn(move || {
            let server = match tiny_http::Server::http(format!("127.0.0.1:{}", port)) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[dtk-automation] Failed to bind port {}: {}", port, e);
                    return;
                }
            };
            eprintln!("[dtk-automation] Listening on http://127.0.0.1:{}", port);

            for mut request in server.incoming_requests() {
                let mut body = String::new();
                if std::io::Read::read_to_string(request.as_reader(), &mut body).is_err() {
                    let _ = request.respond(json_response(&Response {
                        ok: false, data: None,
                        error: Some("Failed to read request body".into()),
                    }));
                    continue;
                }

                let cmd: Command = match serde_json::from_str(&body) {
                    Ok(c) => c,
                    Err(e) => {
                        let _ = request.respond(json_response(&Response {
                            ok: false, data: None,
                            error: Some(format!("Invalid JSON: {}", e)),
                        }));
                        continue;
                    }
                };

                let response = handle_command(&app_handle, cmd);
                let _ = request.respond(json_response(&response));
            }
        });
    }

    fn json_response(resp: &Response) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
        let json = serde_json::to_string(resp).unwrap();
        tiny_http::Response::from_string(json)
            .with_header("Content-Type: application/json".parse::<tiny_http::Header>().unwrap())
    }

    fn handle_command(app: &tauri::AppHandle, cmd: Command) -> Response {
        match cmd.action.as_str() {
            "ping" => Response { ok: true, data: None, error: None },

            "eval" => {
                let script = match cmd.args.first().and_then(|v| v.as_str()) {
                    Some(s) => s.to_string(),
                    None => return Response {
                        ok: false, data: None,
                        error: Some("eval requires a script string arg".into()),
                    },
                };
                match app.get_webview_window("main") {
                    Some(window) => {
                        // Clear any previous result
                        {
                            let (lock, _) = &*DTK_RESULT;
                            *lock.lock().unwrap() = None;
                        }

                        // Wrap: execute script, then invoke IPC command with result
                        let wrapped = format!(
                            r#"(async () => {{
                                try {{
                                    const __r = await (async () => {{ {script} }})();
                                    window.__TAURI_INTERNALS__.invoke('dtk_eval_result', {{
                                        payload: JSON.stringify({{ok: true, value: __r}})
                                    }});
                                }} catch(e) {{
                                    window.__TAURI_INTERNALS__.invoke('dtk_eval_result', {{
                                        payload: JSON.stringify({{ok: false, error: e.message}})
                                    }});
                                }}
                            }})()"#,
                            script = script,
                        );

                        if let Err(e) = window.eval(&wrapped) {
                            return Response {
                                ok: false, data: None,
                                error: Some(format!("eval failed: {}", e)),
                            };
                        }

                        // Wait for JS to call dtk_eval_result IPC command (10s timeout)
                        let (lock, cvar) = &*DTK_RESULT;
                        let guard = lock.lock().unwrap();
                        let (guard, timeout_result) = cvar
                            .wait_timeout(guard, std::time::Duration::from_secs(10))
                            .unwrap();

                        if timeout_result.timed_out() {
                            return Response {
                                ok: false, data: None,
                                error: Some("eval timed out (10s)".into()),
                            };
                        }

                        match guard.as_deref() {
                            Some(payload) => parse_eval_result(payload),
                            None => Response {
                                ok: false, data: None,
                                error: Some("No result received".into()),
                            },
                        }
                    }
                    None => Response {
                        ok: false, data: None,
                        error: Some("Main window not found".into()),
                    },
                }
            }

            "quit" => {
                app.exit(0);
                Response { ok: true, data: None, error: None }
            }

            _ => Response {
                ok: false, data: None,
                error: Some(format!("Unknown action: {}", cmd.action)),
            },
        }
    }

    fn parse_eval_result(payload: &str) -> Response {
        match serde_json::from_str::<serde_json::Value>(payload) {
            Ok(val) => {
                if val.get("ok").and_then(|v| v.as_bool()) == Some(true) {
                    Response {
                        ok: true,
                        data: val.get("value").cloned(),
                        error: None,
                    }
                } else {
                    Response {
                        ok: false,
                        data: None,
                        error: val.get("error").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    }
                }
            }
            Err(_) => Response {
                ok: true,
                data: Some(serde_json::Value::String(payload.to_string())),
                error: None,
            },
        }
    }
}

/// Enable navigator.mediaDevices in a WKWebView via private WebKit preferences API.
/// Without this, WKWebView does not expose mediaDevices even on secure contexts.
#[cfg(target_os = "macos")]
fn enable_media_devices(webview_window: &tauri::WebviewWindow) {
    let _ = webview_window.with_webview(|wv| {
        use objc2::msg_send;
        use objc2::runtime::AnyObject;
        unsafe {
            let inner = wv.inner() as *const AnyObject;
            let config: *const AnyObject = msg_send![&*inner, configuration];
            let prefs: *const AnyObject = msg_send![&*config, preferences];
            let _: () = msg_send![&*prefs, _setMediaDevicesEnabled: true];
            let _: () = msg_send![&*prefs, _setMediaStreamEnabled: true];
            let _: () = msg_send![&*prefs, _setMediaCaptureRequiresSecureConnection: false];
        }
    });
}

#[tauri::command]
fn open_huddle_window(app: tauri::AppHandle, channel_id: String, url: String, title: String) {
    let label = format!("huddle-{}", channel_id);

    // If the huddle window already exists, just focus it
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.set_focus();
        return;
    }

    if let Ok(win) = WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::External(url.parse().unwrap()))
        .title(&title)
        .inner_size(480.0, 640.0)
        .resizable(true)
        .build()
    {
        #[cfg(target_os = "macos")]
        enable_media_devices(&win);
        let _ = win.set_focus();
    }
}

fn main() {
    let is_autostarted = std::env::args().any(|arg| arg == "--autostarted");

    tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(LOCALHOST_PORT).build())
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

            // Enable media devices (camera/mic) for the main webview
            #[cfg(target_os = "macos")]
            if let Some(main_webview) = app.get_webview_window("main") {
                enable_media_devices(&main_webview);
            }

            // Navigate main window to the correct URL
            if let Some(webview) = app.get_webview_window("main") {
                #[cfg(debug_assertions)]
                let url = "http://localhost:3000".to_string();
                #[cfg(not(debug_assertions))]
                let url = format!("http://localhost:{}", LOCALHOST_PORT);
                let _ = webview.navigate(url.parse().unwrap());
            }

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

            // Start automation HTTP server (debug builds only, used by dtk CLI)
            #[cfg(debug_assertions)]
            automation::start(app.handle().clone(), AUTOMATION_PORT);

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
                if window.label() == "main" {
                    // Hide the main window instead of closing (minimize to tray)
                    let _ = window.app_handle().save_window_state(StateFlags::all());
                    api.prevent_close();
                    let _ = window.hide();
                }
                // Other windows (e.g. huddle) close normally
            }
        })
        .invoke_handler(tauri::generate_handler![
            open_huddle_window,
            #[cfg(debug_assertions)]
            automation::dtk_eval_result,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
