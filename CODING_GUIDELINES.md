# Rules

## No string errors in the SDK

All error types in the SDK must be enums, not strings. Never use `Result<T, string>` — always
define a dedicated error enum (e.g., `ParseError`, `DecodeError`) and use `Result<T, MyError>`.

This applies to all code under `sdk/`. Examples may log enum values but must not introduce new
string-based error patterns.

## Keep binary size small

AssemblyScript's standard library pulls in significant code when you use certain features.
The biggest offenders for WASM/PVM binary size:

1. **Template literals with numbers** (`` `value: ${n}` ``) — pulls in `String#concat`,
   `String.UTF8.encode`, `I32#toString`/`U32#toString`/`utoa64`, and related lookup tables.
   Prefer `LogMsg` (buffer-based logger) over `Logger` with template literals.

2. **String concatenation** (`a + b` on strings) — pulls in `String#concat` and `String.UTF8.encode`.

3. **`abort()` error messages** — stdlib file path strings for `abort()`. Already mitigated by
   `noAssert: true` in release builds.

When writing small example services, prefer `LogMsg` to keep the output small. For large services the tradeoff might not be worth it.
