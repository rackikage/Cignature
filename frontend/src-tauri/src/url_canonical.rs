/// Canonical URL key for the duplicate-detect signal.
/// Strips common tracking params and normalizes host casing.
/// Title fuzzy matching is deliberately out of scope (D-004).
pub fn canonicalize(input: &str) -> String {
    let parsed = match url::Url::parse(input.trim()) {
        Ok(u) => u,
        Err(_) => return input.trim().to_lowercase(),
    };

    let host = parsed.host_str().unwrap_or("").to_lowercase();
    let scheme = parsed.scheme();
    let path = parsed.path();

    let stripped_pairs: Vec<(String, String)> = parsed
        .query_pairs()
        .filter(|(k, _)| !is_tracking_param(k))
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();

    let query: Vec<String> = stripped_pairs.iter().map(|(k, v)| format!("{k}={v}")).collect();
    let query_str = query.join("&");

    if query_str.is_empty() {
        format!("{scheme}://{host}{path}")
    } else {
        format!("{scheme}://{host}{path}?{query_str}")
    }
}

fn is_tracking_param(key: &str) -> bool {
    matches!(
        key,
        "utm_source"
            | "utm_medium"
            | "utm_campaign"
            | "utm_term"
            | "utm_content"
            | "si"
            | "feature"
            | "ref"
            | "ref_src"
            | "fbclid"
            | "gclid"
            | "igshid"
            | "ig_rid"
    )
}
