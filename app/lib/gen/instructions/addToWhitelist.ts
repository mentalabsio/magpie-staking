import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface AddToWhitelistArgs {
  rewardRate: BN
  whitelistType: types.WhitelistTypeKind
}

export interface AddToWhitelistAccounts {
  farm: PublicKey
  farmManager: PublicKey
  whitelistProof: PublicKey
  creatorOrMint: PublicKey
  authority: PublicKey
  systemProgram: PublicKey
}

export const layout = borsh.struct([
  borsh.u64("rewardRate"),
  types.WhitelistType.layout("whitelistType"),
])

export function addToWhitelist(
  args: AddToWhitelistArgs,
  accounts: AddToWhitelistAccounts
) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: false },
    { pubkey: accounts.farmManager, isSigner: false, isWritable: false },
    { pubkey: accounts.whitelistProof, isSigner: false, isWritable: true },
    { pubkey: accounts.creatorOrMint, isSigner: false, isWritable: false },
    { pubkey: accounts.authority, isSigner: true, isWritable: true },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([157, 211, 52, 54, 144, 81, 5, 55])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      rewardRate: args.rewardRate,
      whitelistType: args.whitelistType.toEncodable(),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
