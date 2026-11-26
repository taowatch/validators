pub mod chain;
pub mod db;

/// Comma-separated list from an env var, with a default.
pub fn env_list(key: &str, default: &str) -> Vec<String> {
    std::env::var(key)
        .unwrap_or_else(|_| default.to_string())
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

/// Env var parsed as `T`, or `default` when unset/empty. A value that does not parse is a
/// configuration error and stops the process instead of silently using the default.
pub fn env_or<T: std::str::FromStr>(key: &str, default: T) -> T {
    match std::env::var(key) {
        Ok(v) if !v.trim().is_empty() => v.trim().parse().unwrap_or_else(|_| panic!("{key}={v:?} is not a valid value")),
        _ => default,
    }
}
