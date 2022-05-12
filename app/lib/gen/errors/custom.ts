export type CustomError =
  | CooldownIsNotOver
  | CouldNotReserveReward
  | CouldNotReleaseReward
  | GemStillLocked
  | ArithmeticError

export class CooldownIsNotOver extends Error {
  readonly code = 6000
  readonly name = "CooldownIsNotOver"
  readonly msg = "Cooldown is not over yet."

  constructor() {
    super("6000: Cooldown is not over yet.")
  }
}

export class CouldNotReserveReward extends Error {
  readonly code = 6001
  readonly name = "CouldNotReserveReward"
  readonly msg = "Insufficient reward funds. Could not reserve."

  constructor() {
    super("6001: Insufficient reward funds. Could not reserve.")
  }
}

export class CouldNotReleaseReward extends Error {
  readonly code = 6002
  readonly name = "CouldNotReleaseReward"
  readonly msg = "Insufficient reserved reward. Could not release."

  constructor() {
    super("6002: Insufficient reserved reward. Could not release.")
  }
}

export class GemStillLocked extends Error {
  readonly code = 6003
  readonly name = "GemStillLocked"
  readonly msg = "Cannot unstake while the gem is still locked."

  constructor() {
    super("6003: Cannot unstake while the gem is still locked.")
  }
}

export class ArithmeticError extends Error {
  readonly code = 6004
  readonly name = "ArithmeticError"
  readonly msg = "An arithmetic error occurred."

  constructor() {
    super("6004: An arithmetic error occurred.")
  }
}

export function fromCode(code: number): CustomError | null {
  switch (code) {
    case 6000:
      return new CooldownIsNotOver()
    case 6001:
      return new CouldNotReserveReward()
    case 6002:
      return new CouldNotReleaseReward()
    case 6003:
      return new GemStillLocked()
    case 6004:
      return new ArithmeticError()
  }

  return null
}
