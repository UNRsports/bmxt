use serde::{Deserialize, Serialize};

pub const EXIT_SUCCESS: i32 = 0;
#[allow(dead_code)]
pub const EXIT_FAILURE: i32 = 1;
#[allow(dead_code)]
pub const EXIT_MISUSE: i32 = 2;
#[allow(dead_code)]
pub const EXIT_NOT_FOUND: i32 = 127;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ParseSegmentError {
    UnclosedQuote,
    DanglingOperator,
    EmptySegment,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ParsePipeSegmentsResult {
    Ok { ok: bool, segments: Vec<String> },
    Err { ok: bool, error: ParseSegmentError },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParseCompoundSegmentsOk {
    pub ok: bool,
    pub segments: Vec<String>,
    pub operators: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ParseCompoundSegmentsResult {
    Ok(ParseCompoundSegmentsOk),
    Err { ok: bool, error: ParseSegmentError },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompoundPlanOk {
    pub ok: bool,
    pub pipes: Vec<Vec<String>>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub operators: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CompoundPlanResult {
    Ok(CompoundPlanOk),
    Err { ok: bool, error: ParseSegmentError },
}

pub fn is_exit_success(exit_status: i32) -> bool {
    exit_status == EXIT_SUCCESS
}

pub fn compound_should_stop(exit_status: i32) -> bool {
    !is_exit_success(exit_status)
}

pub fn should_run_after_operator(operator: &str, prior_exit_status: i32) -> bool {
    match operator {
        "&&" => is_exit_success(prior_exit_status),
        "||" => !is_exit_success(prior_exit_status),
        ";" => true,
        _ => true,
    }
}

fn read_single_quoted(line: &str, start: usize) -> Option<usize> {
    let chars: Vec<char> = line.chars().collect();
    let mut i = start + 1;
    while i < chars.len() {
        if chars[i] == '\'' {
            return Some(i);
        }
        i += 1;
    }
    None
}

fn read_double_quoted(line: &str, start: usize) -> Option<usize> {
    let chars: Vec<char> = line.chars().collect();
    let mut i = start + 1;
    while i < chars.len() {
        if chars[i] == '\\' && i + 1 < chars.len() {
            i += 2;
            continue;
        }
        if chars[i] == '"' {
            return Some(i);
        }
        i += 1;
    }
    None
}

fn char_at(line: &str, i: usize) -> Option<char> {
    line.chars().nth(i)
}

fn match_compound_operator(line: &str, i: usize) -> Option<(&'static str, usize)> {
    let ch = char_at(line, i)?;
    if ch == '&' && char_at(line, i + 1) == Some('&') {
        return Some(("&&", 2));
    }
    if ch == '|' && char_at(line, i + 1) == Some('|') {
        return Some(("||", 2));
    }
    if ch == ';' {
        return Some((";", 1));
    }
    None
}

pub fn parse_pipe_segments(line: &str) -> ParsePipeSegmentsResult {
    let mut segments: Vec<String> = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = line.chars().collect();
    let n = chars.len();
    let mut i = 0usize;

    while i < n {
        let ch = chars[i];
        if ch == '\'' {
            let slice: String = chars[i..].iter().collect();
            let Some(end) = read_single_quoted(&slice, 0) else {
                return ParsePipeSegmentsResult::Err {
                    ok: false,
                    error: ParseSegmentError::UnclosedQuote,
                };
            };
            current.push_str(&slice[..=end]);
            i += end + 1;
            continue;
        }
        if ch == '"' {
            let slice: String = chars[i..].iter().collect();
            let Some(end) = read_double_quoted(&slice, 0) else {
                return ParsePipeSegmentsResult::Err {
                    ok: false,
                    error: ParseSegmentError::UnclosedQuote,
                };
            };
            current.push_str(&slice[..=end]);
            i += end + 1;
            continue;
        }
        if ch == '\\' && i + 1 < n && chars[i + 1] == '|' {
            current.push('|');
            i += 2;
            continue;
        }
        if ch == '|' {
            let stage = current.trim().to_string();
            if stage.is_empty() {
                return ParsePipeSegmentsResult::Err {
                    ok: false,
                    error: ParseSegmentError::EmptySegment,
                };
            }
            segments.push(stage);
            current.clear();
            i += 1;
            continue;
        }
        current.push(ch);
        i += 1;
    }

    let tail = current.trim().to_string();
    if tail.is_empty() {
        if !segments.is_empty() {
            return ParsePipeSegmentsResult::Err {
                ok: false,
                error: ParseSegmentError::DanglingOperator,
            };
        }
        return ParsePipeSegmentsResult::Err {
            ok: false,
            error: ParseSegmentError::EmptySegment,
        };
    }
    segments.push(tail);

    if segments.is_empty() {
        return ParsePipeSegmentsResult::Err {
            ok: false,
            error: ParseSegmentError::EmptySegment,
        };
    }

    ParsePipeSegmentsResult::Ok {
        ok: true,
        segments,
    }
}

pub fn parse_compound_segments(line: &str) -> ParseCompoundSegmentsResult {
    let mut segments: Vec<String> = Vec::new();
    let mut operators: Vec<String> = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = line.chars().collect();
    let n = chars.len();
    let mut i = 0usize;

    while i < n {
        let ch = chars[i];
        if ch == '\'' {
            let slice: String = chars[i..].iter().collect();
            let Some(end) = read_single_quoted(&slice, 0) else {
                return ParseCompoundSegmentsResult::Err {
                    ok: false,
                    error: ParseSegmentError::UnclosedQuote,
                };
            };
            current.push_str(&slice[..=end]);
            i += end + 1;
            continue;
        }
        if ch == '"' {
            let slice: String = chars[i..].iter().collect();
            let Some(end) = read_double_quoted(&slice, 0) else {
                return ParseCompoundSegmentsResult::Err {
                    ok: false,
                    error: ParseSegmentError::UnclosedQuote,
                };
            };
            current.push_str(&slice[..=end]);
            i += end + 1;
            continue;
        }
        if ch == '\\' && i + 2 < n && chars[i + 1] == '&' && chars[i + 2] == '&' {
            current.push_str("&&");
            i += 3;
            continue;
        }
        if ch == '\\' && i + 2 < n && chars[i + 1] == '|' && chars[i + 2] == '|' {
            current.push_str("||");
            i += 3;
            continue;
        }
        if ch == '\\' && i + 1 < n && chars[i + 1] == ';' {
            current.push(';');
            i += 2;
            continue;
        }

        let slice: String = chars[i..].iter().collect();
        if let Some((op, len)) = match_compound_operator(&slice, 0) {
            let seg = current.trim().to_string();
            if seg.is_empty() {
                return ParseCompoundSegmentsResult::Err {
                    ok: false,
                    error: ParseSegmentError::EmptySegment,
                };
            }
            segments.push(seg);
            operators.push(op.to_string());
            current.clear();
            i += len;
            continue;
        }

        current.push(ch);
        i += 1;
    }

    let tail = current.trim().to_string();
    if tail.is_empty() {
        if !segments.is_empty() {
            return ParseCompoundSegmentsResult::Err {
                ok: false,
                error: ParseSegmentError::DanglingOperator,
            };
        }
        return ParseCompoundSegmentsResult::Err {
            ok: false,
            error: ParseSegmentError::EmptySegment,
        };
    }
    segments.push(tail);

    if segments.is_empty() {
        return ParseCompoundSegmentsResult::Err {
            ok: false,
            error: ParseSegmentError::EmptySegment,
        };
    }

    ParseCompoundSegmentsResult::Ok(ParseCompoundSegmentsOk {
        ok: true,
        segments,
        operators,
    })
}

pub fn plan_compound_line(line: &str) -> CompoundPlanResult {
    match parse_compound_segments(line) {
        ParseCompoundSegmentsResult::Err { error, .. } => CompoundPlanResult::Err {
            ok: false,
            error,
        },
        ParseCompoundSegmentsResult::Ok(parsed) => {
            let mut pipes: Vec<Vec<String>> = Vec::new();
            for segment in parsed.segments {
                match parse_pipe_segments(&segment) {
                    ParsePipeSegmentsResult::Ok { segments, .. } => pipes.push(segments),
                    ParsePipeSegmentsResult::Err { error, .. } => {
                        return CompoundPlanResult::Err { ok: false, error };
                    }
                }
            }
            CompoundPlanResult::Ok(CompoundPlanOk {
                ok: true,
                pipes,
                operators: parsed.operators,
            })
        }
    }
}

pub fn parse_pipe_segments_json(line: &str) -> String {
    serde_json::to_string(&parse_pipe_segments(line)).unwrap_or_else(|e| {
        format!(r#"{{"ok":false,"error":"serialize:{}"}}"#, e)
    })
}

pub fn parse_compound_segments_json(line: &str) -> String {
    serde_json::to_string(&parse_compound_segments(line)).unwrap_or_else(|e| {
        format!(r#"{{"ok":false,"error":"serialize:{}"}}"#, e)
    })
}

pub fn plan_compound_line_json(line: &str) -> String {
    serde_json::to_string(&plan_compound_line(line)).unwrap_or_else(|e| {
        format!(r#"{{"ok":false,"error":"serialize:{}"}}"#, e)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_pipe_splits_outside_quotes() {
        match parse_pipe_segments("tabs -list | close") {
            ParsePipeSegmentsResult::Ok { segments, .. } => {
                assert_eq!(segments, vec!["tabs -list", "close"]);
            }
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn parse_compound_records_operators() {
        match parse_compound_segments("tabs -list || clear") {
            ParseCompoundSegmentsResult::Ok(parsed) => {
                assert_eq!(parsed.segments, vec!["tabs -list", "clear"]);
                assert_eq!(parsed.operators, vec!["||"]);
            }
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn should_run_after_and_only_on_success() {
        assert!(should_run_after_operator("&&", EXIT_SUCCESS));
        assert!(!should_run_after_operator("&&", EXIT_FAILURE));
    }
}
