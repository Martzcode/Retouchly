use std::io::Cursor;
use std::path::PathBuf;
use std::sync::mpsc;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::ImageFormat;
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenDocumentResult {
    pub kind: String,
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub data_url: Option<String>,
    pub content: Option<String>,
}

/// Ouvre un dialogue natif pour choisir un projet Retouchly (.rtly)
/// ou une image PNG/JPG. Renvoie le contenu brut du projet ou l'image
/// décodée en data URL PNG.
#[tauri::command]
pub async fn open_document(app: AppHandle) -> Result<Option<OpenDocumentResult>, String> {
    let (tx, rx) = mpsc::channel::<Option<PathBuf>>();
    app.dialog()
        .file()
        .add_filter("Images et projets Retouchly", &["rtly", "png", "jpg", "jpeg"])
        .pick_file(move |file| {
            let _ = tx.send(file.and_then(|f| f.into_path().ok()));
        });

    let Some(path) = rx.recv().map_err(|e| e.to_string())? else {
        return Ok(None);
    };

    let is_project = path
        .extension()
        .and_then(|e| e.to_str())
        .map_or(false, |e| e.eq_ignore_ascii_case("rtly"));

    if is_project {
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Impossible de lire le projet : {e}"))?;
        return Ok(Some(OpenDocumentResult {
            kind: "project".into(),
            path: path.to_string_lossy().into_owned(),
            width: 0,
            height: 0,
            data_url: None,
            content: Some(content),
        }));
    }

    let img = image::open(&path).map_err(|e| format!("Impossible de lire l'image : {e}"))?;
    let (width, height) = (img.width(), img.height());

    let mut png = Vec::new();
    img.write_to(&mut Cursor::new(&mut png), ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    let data_url = format!("data:image/png;base64,{}", BASE64.encode(png));

    Ok(Some(OpenDocumentResult {
        kind: "image".into(),
        path: path.to_string_lossy().into_owned(),
        width,
        height,
        data_url: Some(data_url),
        content: None,
    }))
}

/// Reçoit le JSON sérialisé du projet et l'écrit sur disque (extension .rtly).
/// Si `path` est fourni, enregistre directement ; sinon ouvre un dialogue.
#[tauri::command]
pub async fn save_project(
    app: AppHandle,
    data: String,
    default_name: Option<String>,
    path: Option<String>,
) -> Result<Option<String>, String> {
    serde_json::from_str::<serde_json::Value>(&data)
        .map_err(|e| format!("Données de projet invalides : {e}"))?;

    let picked: Option<PathBuf> = match path {
        Some(p) => Some(PathBuf::from(p)),
        None => {
            let (tx, rx) = mpsc::channel::<Option<PathBuf>>();
            app.dialog()
                .file()
                .add_filter("Projet Retouchly", &["rtly"])
                .set_file_name(default_name.unwrap_or_else(|| "projet.rtly".to_string()))
                .save_file(move |file| {
                    let _ = tx.send(file.and_then(|f| f.into_path().ok()));
                });
            rx.recv().map_err(|e| e.to_string())?
        }
    };

    let Some(mut path) = picked else {
        return Ok(None);
    };
    let is_rtly = path
        .extension()
        .and_then(|e| e.to_str())
        .map_or(false, |e| e.eq_ignore_ascii_case("rtly"));
    if !is_rtly {
        path.set_extension("rtly");
    }

    std::fs::write(&path, data).map_err(|e| format!("Impossible d'écrire le projet : {e}"))?;

    Ok(Some(path.to_string_lossy().into_owned()))
}
