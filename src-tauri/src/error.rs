use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum CardinalErrorType {
    ArgumentError,
    ArgumentTypeMismatch,
    FileRead(String),
}
#[derive(Debug, Serialize)]
pub struct CardinalError {
    pub error: CardinalErrorType,
    pub traceback: Option<String>,
}
