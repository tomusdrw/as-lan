/** Ecalli method indices matching the JAM specification. */
export enum EcalliIndex {
  // General (0-5, 100)
  Gas = 0,
  Fetch = 1,
  Lookup = 2,
  Read = 3,
  Write = 4,
  Info = 5,

  // Refine (6-13)
  HistoricalLookup = 6,
  Export = 7,
  Machine = 8,
  Peek = 9,
  Poke = 10,
  Pages = 11,
  Invoke = 12,
  Expunge = 13,

  // Accumulate (14-26)
  Bless = 14,
  Assign = 15,
  Designate = 16,
  Checkpoint = 17,
  NewService = 18,
  Upgrade = 19,
  Transfer = 20,
  Eject = 21,
  Query = 22,
  Solicit = 23,
  Forget = 24,
  YieldResult = 25,
  Provide = 26,

  // Debug
  Log = 100,
}
