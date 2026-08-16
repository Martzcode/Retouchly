use glib::object::ObjectExt;
use tauri::Manager;

#[repr(C)]
struct GestureZoom(());

pub fn disable_pinch_zoom<R: tauri::Runtime>(app: &tauri::App<R>) {
    for (_, window) in app.webview_windows() {
        let _ = window.with_webview(|webview| {
            let view = webview.inner();
            unsafe {
                if let Some(zoom) = view.data::<GestureZoom>("wk-view-zoom-gesture") {
                    gobject_sys::g_signal_handlers_destroy(zoom.as_ptr() as *mut gobject_sys::GObject);
                }
            }
        });
    }
}
