use std::path::PathBuf;
use std::sync::mpsc;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::ImageFormat;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Reçoit une data URL PNG du canvas et l'écrit sur disque.
/// Si `path` est fourni, enregistre directement ; sinon ouvre un dialogue.
/// `format` (optionnel) force le format de sortie : "png" ou "jpg".
#[tauri::command]
pub async fn save_image(
    app: AppHandle,
    data_url: String,
    default_name: Option<String>,
    path: Option<String>,
    format: Option<String>,
) -> Result<Option<String>, String> {
    let picked: Option<PathBuf> = match path {
        Some(p) => Some(PathBuf::from(p)),
        None => {
            let (tx, rx) = mpsc::channel::<Option<PathBuf>>();
            app.dialog()
                .file()
                .add_filter("PNG image", &["png"])
                .add_filter("JPEG image", &["jpg", "jpeg"])
                .set_file_name(default_name.unwrap_or_else(|| "image.png".to_string()))
                .save_file(move |file| {
                    let _ = tx.send(file.and_then(|f| f.into_path().ok()));
                });
            rx.recv().map_err(|e| e.to_string())?
        }
    };

    let Some(mut path) = picked else {
        return Ok(None);
    };

    let mut out_format = format_from_path(&path);
    if let Some(f) = format {
        out_format = if f.eq_ignore_ascii_case("jpg") || f.eq_ignore_ascii_case("jpeg") {
            ImageFormat::Jpeg
        } else {
            ImageFormat::Png
        };
    }
    if path.extension().is_none() {
        path.set_extension(match out_format {
            ImageFormat::Jpeg => "jpg",
            _ => "png",
        });
    }

    let raw = data_url
        .strip_prefix("data:image/png;base64,")
        .ok_or_else(|| "Format de données invalide".to_string())?;
    let bytes = BASE64
        .decode(raw)
        .map_err(|e| format!("Décodage base64 impossible : {e}"))?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;

    match out_format {
        ImageFormat::Jpeg => {
            let rgb = composite_on_white(&img.to_rgba8());
            let mut out = Vec::new();
            image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 90)
                .encode_image(&rgb)
                .map_err(|e| e.to_string())?;
            std::fs::write(&path, out).map_err(|e| e.to_string())?;
        }
        _ => img
            .save_with_format(&path, ImageFormat::Png)
            .map_err(|e| e.to_string())?,
    }

    Ok(Some(path.to_string_lossy().into_owned()))
}

fn format_from_path(path: &PathBuf) -> ImageFormat {
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("jpg") || ext.eq_ignore_ascii_case("jpeg") => {
            ImageFormat::Jpeg
        }
        _ => ImageFormat::Png,
    }
}

fn composite_on_white(rgba: &image::RgbaImage) -> image::RgbImage {
    let mut rgb = image::RgbImage::new(rgba.width(), rgba.height());
    for (x, y, px) in rgba.enumerate_pixels() {
        let [r, g, b, a] = px.0;
        let f = a as f32 / 255.0;
        rgb.put_pixel(
            x,
            y,
            image::Rgb([
                (r as f32 * f + 255.0 * (1.0 - f)) as u8,
                (g as f32 * f + 255.0 * (1.0 - f)) as u8,
                (b as f32 * f + 255.0 * (1.0 - f)) as u8,
            ]),
        );
    }
    rgb
}
