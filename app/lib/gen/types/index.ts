import * as WhitelistType from "./WhitelistType";

export { LockConfig } from "./LockConfig";
export { Reward } from "./Reward";
export { Buff } from "./Buff";
export { WhitelistType };

export type WhitelistTypeKind =
  | WhitelistType.Creator
  | WhitelistType.Mint
  | WhitelistType.Buff;
export type WhitelistTypeJSON =
  | WhitelistType.CreatorJSON
  | WhitelistType.MintJSON
  | WhitelistType.BuffJSON;
