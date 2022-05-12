import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface FundRewardArgs {
  amount: BN
}

export interface FundRewardAccounts {
  farm: PublicKey
  farmManager: PublicKey
  mint: PublicKey
  farmVault: PublicKey
  managerAta: PublicKey
  authority: PublicKey
  tokenProgram: PublicKey
}

export const layout = borsh.struct([borsh.u64("amount")])

export function fundReward(args: FundRewardArgs, accounts: FundRewardAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: true },
    { pubkey: accounts.farmManager, isSigner: false, isWritable: false },
    { pubkey: accounts.mint, isSigner: false, isWritable: false },
    { pubkey: accounts.farmVault, isSigner: false, isWritable: true },
    { pubkey: accounts.managerAta, isSigner: false, isWritable: true },
    { pubkey: accounts.authority, isSigner: true, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([188, 50, 249, 165, 93, 151, 38, 63])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
