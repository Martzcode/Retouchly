use std::collections::HashSet;
use std::process::Command;

#[tauri::command]
pub fn list_system_fonts() -> Vec<String> {
    let mut fonts = HashSet::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("fc-list").arg(":").arg("family").output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let name = line.trim().to_string();
                if !name.is_empty() {
                    fonts.insert(name);
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("system_profiler")
            .args(["SPFontsDataType", "-detailLevel", "mini"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let line = line.trim();
                if let Some(name) = line.strip_prefix("Full Name: ") {
                    let name = name.trim().to_string();
                    if !name.is_empty() {
                        fonts.insert(name);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let ps_script = r#"
            [void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing')
            $families = [System.Drawing.FontFamily]::Families
            foreach ($f in $families) { Write-Output $f.Name }
        "#;
        if let Ok(output) = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_script])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let name = line.trim().to_string();
                if !name.is_empty() {
                    fonts.insert(name);
                }
            }
        }
    }

    let mut result: Vec<String> = fonts.into_iter().collect();
    result.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    result
}
