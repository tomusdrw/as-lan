;; PVM adapter for as-lan services.
;;
;; Maps WASM imports declared in sdk/ecalli.ts to PVM ecalli host calls.
;; Used by wasm-pvm (>= 0.5.1) via --adapter flag during WASM -> PVM compilation.
;;
;; Host call convention: host_call_N where N = number of data registers (r7-r12).
;; All variants take ecalli index as first i64 param and return r7.
;;
;; Ecalli index reference (GP Appendix B):
;;   0   = gas remaining    (Omega_G)
;;   1   = fetch            (Omega_Y)
;;   2   = lookup preimage  (Omega_L)
;;   3   = read storage     (Omega_R)
;;   4   = write storage    (Omega_W)
;;   5   = info             (Omega_I)
;;   100 = JIP-1 debug log
(module
  (import "env" "host_call_0" (func $host_call_0 (param i64) (result i64)))
  (import "env" "host_call_4" (func $host_call_4 (param i64 i64 i64 i64 i64) (result i64)))
  (import "env" "host_call_5" (func $host_call_5 (param i64 i64 i64 i64 i64 i64) (result i64)))
  (import "env" "host_call_6" (func $host_call_6 (param i64 i64 i64 i64 i64 i64 i64) (result i64)))
  (import "env" "pvm_ptr" (func $pvm_ptr (param i64) (result i64)))

  ;; abort — AssemblyScript runtime panic, trap immediately.
  (func (export "abort") (param i32 i32 i32 i32)
    unreachable
  )

  ;; -----------------------------------------------------------------------
  ;; gas() -> i64                                              [ecalli 0]
  ;; -----------------------------------------------------------------------
  (func (export "gas") (result i64)
    (call $host_call_0
      (i64.const 0)
    )
  )

  ;; -----------------------------------------------------------------------
  ;; fetch(dest, offset, length, kind, p1, p2) -> i64          [ecalli 1]
  ;; r7=dest, r8=offset, r9=length, r10=kind, r11=p1, r12=p2
  ;; -----------------------------------------------------------------------
  (func (export "fetch")
    (param $dest_ptr i32) (param $offset i32) (param $length i32)
    (param $kind i32) (param $param1 i32) (param $param2 i32)
    (result i64)
    (call $host_call_6
      (i64.const 1)                                                    ;; ecalli 1: fetch
      (call $pvm_ptr (i64.extend_i32_u (local.get $dest_ptr)))         ;; r7:  destination PVM pointer
      (i64.extend_i32_u (local.get $offset))                           ;; r8:  offset
      (i64.extend_i32_u (local.get $length))                           ;; r9:  length
      (i64.extend_i32_u (local.get $kind))                             ;; r10: fetch kind
      (i64.extend_i32_u (local.get $param1))                           ;; r11: param1
      (i64.extend_i32_u (local.get $param2))                           ;; r12: param2
    )
  )

  ;; -----------------------------------------------------------------------
  ;; lookup(service, hash_ptr, out_ptr, offset, length) -> i64 [ecalli 2]
  ;; r7=service, r8=hash_ptr, r9=out_ptr, r10=offset, r11=length
  ;; -----------------------------------------------------------------------
  (func (export "lookup")
    (param $service i32) (param $hash_ptr i32) (param $out_ptr i32)
    (param $offset i32) (param $length i32)
    (result i64)
    (call $host_call_5
      (i64.const 2)                                                    ;; ecalli 2: lookup
      (i64.extend_i32_u (local.get $service))                          ;; r7:  service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $hash_ptr)))         ;; r8:  hash PVM pointer
      (call $pvm_ptr (i64.extend_i32_u (local.get $out_ptr)))          ;; r9:  destination PVM pointer
      (i64.extend_i32_u (local.get $offset))                           ;; r10: offset
      (i64.extend_i32_u (local.get $length))                           ;; r11: length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; read(service, key_ptr, key_len, out_ptr, offset, length) -> i64
  ;;                                                           [ecalli 3]
  ;; r7=service, r8=key_ptr, r9=key_len, r10=out_ptr, r11=offset, r12=length
  ;; -----------------------------------------------------------------------
  (func (export "read")
    (param $service i32) (param $key_ptr i32) (param $key_len i32)
    (param $out_ptr i32) (param $offset i32) (param $length i32)
    (result i64)
    (call $host_call_6
      (i64.const 3)                                                    ;; ecalli 3: read
      (i64.extend_i32_u (local.get $service))                          ;; r7:  service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $key_ptr)))          ;; r8:  key PVM pointer
      (i64.extend_i32_u (local.get $key_len))                          ;; r9:  key length
      (call $pvm_ptr (i64.extend_i32_u (local.get $out_ptr)))          ;; r10: destination PVM pointer
      (i64.extend_i32_u (local.get $offset))                           ;; r11: offset
      (i64.extend_i32_u (local.get $length))                           ;; r12: max length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; write(key_ptr, key_len, value_ptr, value_len) -> i64      [ecalli 4]
  ;; r7=key_ptr, r8=key_len, r9=value_ptr, r10=value_len
  ;; -----------------------------------------------------------------------
  (func (export "write")
    (param $key_ptr i32) (param $key_len i32)
    (param $value_ptr i32) (param $value_len i32)
    (result i64)
    (call $host_call_4
      (i64.const 4)                                                    ;; ecalli 4: write
      (call $pvm_ptr (i64.extend_i32_u (local.get $key_ptr)))          ;; r7:  key PVM pointer
      (i64.extend_i32_u (local.get $key_len))                          ;; r8:  key length
      (call $pvm_ptr (i64.extend_i32_u (local.get $value_ptr)))        ;; r9:  value PVM pointer
      (i64.extend_i32_u (local.get $value_len))                        ;; r10: value length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; info(service, out_ptr, offset, length) -> i64             [ecalli 5]
  ;; r7=service, r8=out_ptr, r9=offset, r10=length
  ;; -----------------------------------------------------------------------
  (func (export "info")
    (param $service i32) (param $out_ptr i32)
    (param $offset i32) (param $length i32)
    (result i64)
    (call $host_call_4
      (i64.const 5)                                                    ;; ecalli 5: info
      (i64.extend_i32_u (local.get $service))                          ;; r7:  service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $out_ptr)))          ;; r8:  destination PVM pointer
      (i64.extend_i32_u (local.get $offset))                           ;; r9:  offset
      (i64.extend_i32_u (local.get $length))                           ;; r10: length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; log(level, target_ptr, target_len, msg_ptr, msg_len) -> i32
  ;;                                                           [ecalli 100]
  ;; -----------------------------------------------------------------------
  (func (export "log")
    (param $level i32)
    (param $target_ptr i32) (param $target_len i32)
    (param $msg_ptr i32) (param $msg_len i32)
    (result i32)
    (drop (call $host_call_5
      (i64.const 100)                                                  ;; ecalli 100: JIP-1 log
      (i64.extend_i32_u (local.get $level))                            ;; r7:  log level
      (call $pvm_ptr (i64.extend_i32_u (local.get $target_ptr)))       ;; r8:  target PVM pointer
      (i64.extend_i32_u (local.get $target_len))                       ;; r9:  target length
      (call $pvm_ptr (i64.extend_i32_u (local.get $msg_ptr)))          ;; r10: message PVM pointer
      (i64.extend_i32_u (local.get $msg_len))                          ;; r11: message length
    ))
    (i32.const 0)
  )
)
