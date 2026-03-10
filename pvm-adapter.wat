;; PVM adapter for as-lan services.
;;
;; Maps WASM imports declared in sdk/ecalli.ts to PVM ecalli host calls.
;; Used by wasm-pvm via --adapter flag during WASM -> PVM compilation.
;;
;; Ecalli index reference:
;;   0   = gas remaining (GP Appendix B, Omega_G)
;;   100 = JIP-1 debug log
;;
;; NOTE: "lookup" (sdk/ecalli.ts) is not yet mapped here. When its ecalli
;; index is assigned, add an export for it below. Until then, services
;; using lookup() will fail at PVM compilation with an unresolved import.
(module
  (import "env" "host_call" (func $host_call (param i64 i64 i64 i64 i64 i64)))
  (import "env" "host_call" (func $host_call_ret (param i64) (result i64)))
  (import "env" "pvm_ptr" (func $pvm_ptr (param i64) (result i64)))

  ;; abort — AssemblyScript runtime panic, trap immediately.
  (func (export "abort") (param i32 i32 i32 i32)
    unreachable
  )

  ;; gas() -> i64
  ;; Ecalli 0: gas remaining. No parameters, result returned via r7.
  (func (export "gas") (result i64)
    (call $host_call_ret
      (i64.const 0)   ;; ecalli 0: gas remaining
    )
  )

  ;; log(level, target_ptr, target_len, msg_ptr, msg_len) -> i32
  ;; Ecalli 100: JIP-1 debug log.
  (func (export "log")
    (param $level i32)
    (param $target_ptr i32) (param $target_len i32)
    (param $msg_ptr i32) (param $msg_len i32)
    (result i32)
    (call $host_call
      (i64.const 100)                                                  ;; ecalli 100: JIP-1 log
      (i64.extend_i32_u (local.get $level))                            ;; r7:  log level
      (call $pvm_ptr (i64.extend_i32_u (local.get $target_ptr)))       ;; r8:  target PVM pointer
      (i64.extend_i32_u (local.get $target_len))                       ;; r9:  target length
      (call $pvm_ptr (i64.extend_i32_u (local.get $msg_ptr)))          ;; r10: message PVM pointer
      (i64.extend_i32_u (local.get $msg_len))                          ;; r11: message length
    )
    (i32.const 0)
  )
)
