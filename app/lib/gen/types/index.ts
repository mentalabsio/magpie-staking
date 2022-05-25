import * as WhitelistType from "./WhitelistType"

export { LockConfig, LockConfigFields, LockConfigJSON } from "./LockConfig"
export { Reward, RewardFields, RewardJSON } from "./Reward"
export { Buff, BuffFields, BuffJSON } from "./Buff"
export { WhitelistType }

export type WhitelistTypeKind =
  | WhitelistType.Creator
  | WhitelistType.Mint
  | WhitelistType.Buff
export type WhitelistTypeJSON =
  | WhitelistType.CreatorJSON
  | WhitelistType.MintJSON
  | WhitelistType.BuffJSON
