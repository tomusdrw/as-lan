# Rules

## No string errors in the SDK

All error types in the SDK must be enums, not strings. Never use `Result<T, string>` — always
define a dedicated error enum (e.g., `ParseError`, `DecodeError`) and use `Result<T, MyError>`.

This applies to all code under `sdk/`. Examples may log enum values but must not introduce new
string-based error patterns.
