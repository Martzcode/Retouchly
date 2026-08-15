mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::image::open_image,
            commands::image::save_image,
        ])
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de Retouchly");
}
