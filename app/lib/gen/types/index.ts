import * as WhitelistType from "./WhitelistType"

export { LockConfig } from "./LockConfig"
export { Reward } from "./Reward"
export { AssociatedObject } from "./AssociatedObject"
export { WhitelistType }

export type WhitelistTypeKind =
  | WhitelistType.Creator
  | WhitelistType.Mint
  | WhitelistType.AssociatedObject
export type WhitelistTypeJSON =
  | WhitelistType.CreatorJSON
  | WhitelistType.MintJSON
  | WhitelistType.AssociatedObjectJSON
