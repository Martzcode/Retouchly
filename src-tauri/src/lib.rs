mod commands;
#[cfg(target_os = "linux")]
mod zoom;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::image::open_image,
            commands::image::save_image,
            commands::fonts::list_system_fonts,
        ])
        .setup(|app| {
            #[cfg(target_os = "linux")]
            zoom::disable_pinch_zoom(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Retouchly");
}
