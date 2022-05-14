import * as WhitelistType from "./WhitelistType"

export { LockConfig, LockConfigFields, LockConfigJSON } from "./LockConfig"
export { Reward, RewardFields, RewardJSON } from "./Reward"
export { WhitelistType }

export type WhitelistTypeKind = WhitelistType.Creator | WhitelistType.Mint
export type WhitelistTypeJSON =
  | WhitelistType.CreatorJSON
  | WhitelistType.MintJSON
