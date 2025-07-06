use std::path::{Path, PathBuf};

pub fn expand_tilde<T: AsRef<Path>>(path: T) -> PathBuf {
    let path = path.as_ref();
    if let Ok(p) = path.strip_prefix("~/") {
        if let Some(home) = get_home_dir() {
            return home.join(p);
        }
    }
    path.to_path_buf()
}
pub fn get_home_dir() -> Option<PathBuf> {
    #[cfg(unix)]
    {
        use std::env;

        if let Ok(home) = env::var("HOME") {
            return Some(PathBuf::from(home));
        }
        //TODO: Later add fallbacks for homedirs
        None
    }
    #[cfg(windows)]
    {
        use std::env;
        env::var("USERPROFILE").ok().map(PathBuf::from)
    }
}
