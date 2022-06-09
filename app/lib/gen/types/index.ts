import * as WhitelistType from "./WhitelistType"

export { LockConfig, LockConfigFields, LockConfigJSON } from "./LockConfig"
export { Reward, RewardFields, RewardJSON } from "./Reward"
export {
  AssociatedObject,
  AssociatedObjectFields,
  AssociatedObjectJSON,
} from "./AssociatedObject"
export { WhitelistType }

export type WhitelistTypeKind =
  | WhitelistType.Creator
  | WhitelistType.Mint
  | WhitelistType.AssociatedObject
export type WhitelistTypeJSON =
  | WhitelistType.CreatorJSON
  | WhitelistType.MintJSON
  | WhitelistType.AssociatedObjectJSON
