;; PVM adapter for as-lan services.
;;
;; Maps WASM imports declared in sdk/ecalli.ts to PVM ecalli host calls.
;; Used by wasm-pvm (>= 0.5.1) via --adapter flag during WASM -> PVM compilation.
;;
;; Host call convention: host_call_N where N = number of data registers (r7-r12).
;; All variants take ecalli index as first i64 param and return r7.
;; host_call_Nb variants also capture r8, retrievable via host_call_r8()
;; (must be called in the same function as the preceding host_call_Nb).
;;
;; Ecalli index reference (GP Appendix B):
;;   0   = gas remaining         (Omega_G)
;;   1   = fetch                 (Omega_Y)
;;   2   = lookup preimage       (Omega_L)
;;   3   = read storage          (Omega_R)
;;   4   = write storage         (Omega_W)
;;   5   = info                  (Omega_I)
;;   6   = historical_lookup     (Omega_H)
;;   7   = export                (Omega_E)
;;   8   = machine               (Omega_N)
;;   9   = peek                  (Omega_P)
;;   10  = poke                  (Omega_K)
;;   11  = pages                 (Omega_A)
;;   12  = invoke                (Omega_V)
;;   13  = expunge               (Omega_X)
;;   14  = bless                 (Omega_B)
;;   15  = assign                (Omega_C)
;;   16  = designate             (Omega_D)
;;   17  = checkpoint            (Omega_T)
;;   18  = new_service           (Omega_S)
;;   19  = upgrade               (Omega_U)
;;   20  = transfer              (Omega_F)
;;   21  = eject                 (Omega_J)
;;   22  = query                 (Omega_Q)
;;   23  = solicit               (Omega_O)
;;   24  = forget                (Omega_Z)
;;   25  = yield_result          (Omega_M)
;;   26  = provide               (Omega_P)
;;   100 = JIP-1 debug log
(module
  (import "env" "memory" (memory 0))
  (import "env" "host_call_0" (func $host_call_0 (param i64) (result i64)))
  (import "env" "host_call_1" (func $host_call_1 (param i64 i64) (result i64)))
  (import "env" "host_call_2" (func $host_call_2 (param i64 i64 i64) (result i64)))
  (import "env" "host_call_2b" (func $host_call_2b (param i64 i64 i64) (result i64)))
  (import "env" "host_call_3" (func $host_call_3 (param i64 i64 i64 i64) (result i64)))
  (import "env" "host_call_4" (func $host_call_4 (param i64 i64 i64 i64 i64) (result i64)))
  (import "env" "host_call_5" (func $host_call_5 (param i64 i64 i64 i64 i64 i64) (result i64)))
  (import "env" "host_call_6" (func $host_call_6 (param i64 i64 i64 i64 i64 i64 i64) (result i64)))
  (import "env" "host_call_r8" (func $host_call_r8 (result i64)))
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

  ;; =======================================================================
  ;; Refine host calls (6-13)
  ;; =======================================================================

  ;; -----------------------------------------------------------------------
  ;; historical_lookup(service, hash_ptr, out_ptr, offset, length) -> i64
  ;;                                                           [ecalli 6]
  ;; -----------------------------------------------------------------------
  (func (export "historical_lookup")
    (param $service i32) (param $hash_ptr i32) (param $out_ptr i32)
    (param $offset i32) (param $length i32)
    (result i64)
    (call $host_call_5
      (i64.const 6)                                                    ;; ecalli 6: historical_lookup
      (i64.extend_i32_u (local.get $service))                          ;; r7:  service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $hash_ptr)))         ;; r8:  hash PVM pointer
      (call $pvm_ptr (i64.extend_i32_u (local.get $out_ptr)))          ;; r9:  destination PVM pointer
      (i64.extend_i32_u (local.get $offset))                           ;; r10: offset
      (i64.extend_i32_u (local.get $length))                           ;; r11: length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; export(segment_ptr, segment_len) -> i64                   [ecalli 7]
  ;; -----------------------------------------------------------------------
  (func (export "export")
    (param $segment_ptr i32) (param $segment_len i32)
    (result i64)
    (call $host_call_2
      (i64.const 7)                                                    ;; ecalli 7: export
      (call $pvm_ptr (i64.extend_i32_u (local.get $segment_ptr)))      ;; r7:  segment PVM pointer
      (i64.extend_i32_u (local.get $segment_len))                      ;; r8:  segment length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; machine(code_ptr, code_len, entrypoint) -> i64            [ecalli 8]
  ;; -----------------------------------------------------------------------
  (func (export "machine")
    (param $code_ptr i32) (param $code_len i32) (param $entrypoint i32)
    (result i64)
    (call $host_call_3
      (i64.const 8)                                                    ;; ecalli 8: machine
      (call $pvm_ptr (i64.extend_i32_u (local.get $code_ptr)))         ;; r7:  code PVM pointer
      (i64.extend_i32_u (local.get $code_len))                         ;; r8:  code length
      (i64.extend_i32_u (local.get $entrypoint))                       ;; r9:  entrypoint
    )
  )

  ;; -----------------------------------------------------------------------
  ;; peek(machine, dest_ptr, source, length) -> i64            [ecalli 9]
  ;; -----------------------------------------------------------------------
  (func (export "peek")
    (param $machine i32) (param $dest_ptr i32)
    (param $source i32) (param $length i32)
    (result i64)
    (call $host_call_4
      (i64.const 9)                                                    ;; ecalli 9: peek
      (i64.extend_i32_u (local.get $machine))                          ;; r7:  machine ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $dest_ptr)))         ;; r8:  destination PVM pointer
      (i64.extend_i32_u (local.get $source))                           ;; r9:  source address in machine
      (i64.extend_i32_u (local.get $length))                           ;; r10: length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; poke(machine, source_ptr, dest, length) -> i64            [ecalli 10]
  ;; -----------------------------------------------------------------------
  (func (export "poke")
    (param $machine i32) (param $source_ptr i32)
    (param $dest i32) (param $length i32)
    (result i64)
    (call $host_call_4
      (i64.const 10)                                                   ;; ecalli 10: poke
      (i64.extend_i32_u (local.get $machine))                          ;; r7:  machine ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $source_ptr)))       ;; r8:  source PVM pointer
      (i64.extend_i32_u (local.get $dest))                             ;; r9:  destination in machine
      (i64.extend_i32_u (local.get $length))                           ;; r10: length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; pages(machine, start_page, page_count, access_type) -> i64 [ecalli 11]
  ;; -----------------------------------------------------------------------
  (func (export "pages")
    (param $machine i32) (param $start_page i32)
    (param $page_count i32) (param $access_type i32)
    (result i64)
    (call $host_call_4
      (i64.const 11)                                                   ;; ecalli 11: pages
      (i64.extend_i32_u (local.get $machine))                          ;; r7:  machine ID
      (i64.extend_i32_u (local.get $start_page))                       ;; r8:  start page
      (i64.extend_i32_u (local.get $page_count))                       ;; r9:  page count
      (i64.extend_i32_u (local.get $access_type))                      ;; r10: access type
    )
  )

  ;; -----------------------------------------------------------------------
  ;; invoke(machine, io_ptr, out_r8) -> i64                    [ecalli 12]
  ;; Returns r7 (exit reason). Writes r8 to out_r8 pointer.
  ;; -----------------------------------------------------------------------
  (func (export "invoke")
    (param $machine i32) (param $io_ptr i32) (param $out_r8 i32)
    (result i64)
    (local $r7 i64)
    (local.set $r7 (call $host_call_2b
      (i64.const 12)                                                   ;; ecalli 12: invoke
      (i64.extend_i32_u (local.get $machine))                          ;; r7:  machine ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $io_ptr)))           ;; r8:  I/O structure PVM pointer
    ))
    (i64.store (local.get $out_r8) (call $host_call_r8))
    (local.get $r7)
  )

  ;; -----------------------------------------------------------------------
  ;; expunge(machine) -> i64                                   [ecalli 13]
  ;; -----------------------------------------------------------------------
  (func (export "expunge")
    (param $machine i32)
    (result i64)
    (call $host_call_1
      (i64.const 13)                                                   ;; ecalli 13: expunge
      (i64.extend_i32_u (local.get $machine))                          ;; r7:  machine ID
    )
  )

  ;; =======================================================================
  ;; Accumulate host calls (14-26)
  ;; =======================================================================

  ;; -----------------------------------------------------------------------
  ;; bless(manager, auth_queue_ptr, delegator, registrar,
  ;;       auto_accum_ptr, auto_accum_count) -> i64            [ecalli 14]
  ;; -----------------------------------------------------------------------
  (func (export "bless")
    (param $manager i32) (param $auth_queue_ptr i32)
    (param $delegator i32) (param $registrar i32)
    (param $auto_accum_ptr i32) (param $auto_accum_count i32)
    (result i64)
    (call $host_call_6
      (i64.const 14)                                                   ;; ecalli 14: bless
      (i64.extend_i32_u (local.get $manager))                          ;; r7:  manager service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $auth_queue_ptr)))   ;; r8:  auth queue PVM pointer
      (i64.extend_i32_u (local.get $delegator))                        ;; r9:  delegator service ID
      (i64.extend_i32_u (local.get $registrar))                        ;; r10: registrar service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $auto_accum_ptr)))   ;; r11: auto-accum PVM pointer
      (i64.extend_i32_u (local.get $auto_accum_count))                 ;; r12: auto-accum count
    )
  )

  ;; -----------------------------------------------------------------------
  ;; assign(core, auth_queue_ptr, assigners) -> i64            [ecalli 15]
  ;; -----------------------------------------------------------------------
  (func (export "assign")
    (param $core i32) (param $auth_queue_ptr i32) (param $assigners i32)
    (result i64)
    (call $host_call_3
      (i64.const 15)                                                   ;; ecalli 15: assign
      (i64.extend_i32_u (local.get $core))                             ;; r7:  core index
      (call $pvm_ptr (i64.extend_i32_u (local.get $auth_queue_ptr)))   ;; r8:  auth queue PVM pointer
      (i64.extend_i32_u (local.get $assigners))                        ;; r9:  assigners
    )
  )

  ;; -----------------------------------------------------------------------
  ;; designate(validators_ptr) -> i64                          [ecalli 16]
  ;; -----------------------------------------------------------------------
  (func (export "designate")
    (param $validators_ptr i32)
    (result i64)
    (call $host_call_1
      (i64.const 16)                                                   ;; ecalli 16: designate
      (call $pvm_ptr (i64.extend_i32_u (local.get $validators_ptr)))   ;; r7:  validators PVM pointer
    )
  )

  ;; -----------------------------------------------------------------------
  ;; checkpoint() -> i64                                       [ecalli 17]
  ;; -----------------------------------------------------------------------
  (func (export "checkpoint") (result i64)
    (call $host_call_0
      (i64.const 17)
    )
  )

  ;; -----------------------------------------------------------------------
  ;; new_service(code_hash_ptr, code_len, gas, allowance,
  ;;             gratis_storage, requested_id) -> i64          [ecalli 18]
  ;; -----------------------------------------------------------------------
  (func (export "new_service")
    (param $code_hash_ptr i32) (param $code_len i32)
    (param $gas i64) (param $allowance i64)
    (param $gratis_storage i32) (param $requested_id i32)
    (result i64)
    (call $host_call_6
      (i64.const 18)                                                   ;; ecalli 18: new_service
      (call $pvm_ptr (i64.extend_i32_u (local.get $code_hash_ptr)))    ;; r7:  code hash PVM pointer
      (i64.extend_i32_u (local.get $code_len))                         ;; r8:  code length
      (local.get $gas)                                                 ;; r9:  min accumulate gas
      (local.get $allowance)                                           ;; r10: initial allowance
      (i64.extend_i32_u (local.get $gratis_storage))                   ;; r11: gratis storage
      (i64.extend_i32_u (local.get $requested_id))                     ;; r12: requested ID
    )
  )

  ;; -----------------------------------------------------------------------
  ;; upgrade(code_hash_ptr, gas, allowance) -> i64             [ecalli 19]
  ;; -----------------------------------------------------------------------
  (func (export "upgrade")
    (param $code_hash_ptr i32) (param $gas i64) (param $allowance i64)
    (result i64)
    (call $host_call_3
      (i64.const 19)                                                   ;; ecalli 19: upgrade
      (call $pvm_ptr (i64.extend_i32_u (local.get $code_hash_ptr)))    ;; r7:  code hash PVM pointer
      (local.get $gas)                                                 ;; r8:  new min accumulate gas
      (local.get $allowance)                                           ;; r9:  new allowance
    )
  )

  ;; -----------------------------------------------------------------------
  ;; transfer(dest, amount, gas_fee, memo_ptr) -> i64          [ecalli 20]
  ;; -----------------------------------------------------------------------
  (func (export "transfer")
    (param $dest i32) (param $amount i64) (param $gas_fee i64) (param $memo_ptr i32)
    (result i64)
    (call $host_call_4
      (i64.const 20)                                                   ;; ecalli 20: transfer
      (i64.extend_i32_u (local.get $dest))                             ;; r7:  destination service ID
      (local.get $amount)                                              ;; r8:  amount
      (local.get $gas_fee)                                             ;; r9:  gas fee limit
      (call $pvm_ptr (i64.extend_i32_u (local.get $memo_ptr)))         ;; r10: memo PVM pointer
    )
  )

  ;; -----------------------------------------------------------------------
  ;; eject(service, prev_code_hash_ptr) -> i64                 [ecalli 21]
  ;; -----------------------------------------------------------------------
  (func (export "eject")
    (param $service i32) (param $prev_code_hash_ptr i32)
    (result i64)
    (call $host_call_2
      (i64.const 21)                                                   ;; ecalli 21: eject
      (i64.extend_i32_u (local.get $service))                          ;; r7:  service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $prev_code_hash_ptr))) ;; r8: prev code hash PVM ptr
    )
  )

  ;; -----------------------------------------------------------------------
  ;; query(hash_ptr, length, out_r8) -> i64                    [ecalli 22]
  ;; Returns r7 (NONE or status). Writes r8 (slot info) to out_r8 pointer.
  ;; -----------------------------------------------------------------------
  (func (export "query")
    (param $hash_ptr i32) (param $length i32) (param $out_r8 i32)
    (result i64)
    (local $r7 i64)
    (local.set $r7 (call $host_call_2b
      (i64.const 22)                                                   ;; ecalli 22: query
      (call $pvm_ptr (i64.extend_i32_u (local.get $hash_ptr)))         ;; r7:  hash PVM pointer
      (i64.extend_i32_u (local.get $length))                           ;; r8:  preimage length
    ))
    (i64.store (local.get $out_r8) (call $host_call_r8))
    (local.get $r7)
  )

  ;; -----------------------------------------------------------------------
  ;; solicit(hash_ptr, length) -> i64                          [ecalli 23]
  ;; -----------------------------------------------------------------------
  (func (export "solicit")
    (param $hash_ptr i32) (param $length i32)
    (result i64)
    (call $host_call_2
      (i64.const 23)                                                   ;; ecalli 23: solicit
      (call $pvm_ptr (i64.extend_i32_u (local.get $hash_ptr)))         ;; r7:  hash PVM pointer
      (i64.extend_i32_u (local.get $length))                           ;; r8:  preimage length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; forget(hash_ptr, length) -> i64                           [ecalli 24]
  ;; -----------------------------------------------------------------------
  (func (export "forget")
    (param $hash_ptr i32) (param $length i32)
    (result i64)
    (call $host_call_2
      (i64.const 24)                                                   ;; ecalli 24: forget
      (call $pvm_ptr (i64.extend_i32_u (local.get $hash_ptr)))         ;; r7:  hash PVM pointer
      (i64.extend_i32_u (local.get $length))                           ;; r8:  preimage length
    )
  )

  ;; -----------------------------------------------------------------------
  ;; yield_result(hash_ptr) -> i64                             [ecalli 25]
  ;; -----------------------------------------------------------------------
  (func (export "yield_result")
    (param $hash_ptr i32)
    (result i64)
    (call $host_call_1
      (i64.const 25)                                                   ;; ecalli 25: yield_result
      (call $pvm_ptr (i64.extend_i32_u (local.get $hash_ptr)))         ;; r7:  hash PVM pointer
    )
  )

  ;; -----------------------------------------------------------------------
  ;; provide(service, preimage_ptr, preimage_len) -> i64       [ecalli 26]
  ;; -----------------------------------------------------------------------
  (func (export "provide")
    (param $service i32) (param $preimage_ptr i32) (param $preimage_len i32)
    (result i64)
    (call $host_call_3
      (i64.const 26)                                                   ;; ecalli 26: provide
      (i64.extend_i32_u (local.get $service))                          ;; r7:  service ID
      (call $pvm_ptr (i64.extend_i32_u (local.get $preimage_ptr)))     ;; r8:  preimage PVM pointer
      (i64.extend_i32_u (local.get $preimage_len))                     ;; r9:  preimage length
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
