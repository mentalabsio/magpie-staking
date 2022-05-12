import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface UnstakeArgs {
  amount: BN
}

export interface UnstakeAccounts {
  farm: PublicKey
  farmer: PublicKey
  gemMint: PublicKey
  gemMetadata: PublicKey
  collectionData: PublicKey
  stakeReceipt: PublicKey
  lock: PublicKey
  farmerVault: PublicKey
  gemOwnerAta: PublicKey
  owner: PublicKey
  tokenProgram: PublicKey
}

export const layout = borsh.struct([borsh.u64("amount")])

export function unstake(args: UnstakeArgs, accounts: UnstakeAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: true },
    { pubkey: accounts.farmer, isSigner: false, isWritable: true },
    { pubkey: accounts.gemMint, isSigner: false, isWritable: false },
    { pubkey: accounts.gemMetadata, isSigner: false, isWritable: false },
    { pubkey: accounts.collectionData, isSigner: false, isWritable: false },
    { pubkey: accounts.stakeReceipt, isSigner: false, isWritable: true },
    { pubkey: accounts.lock, isSigner: false, isWritable: false },
    { pubkey: accounts.farmerVault, isSigner: false, isWritable: true },
    { pubkey: accounts.gemOwnerAta, isSigner: false, isWritable: true },
    { pubkey: accounts.owner, isSigner: true, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([90, 95, 107, 42, 205, 124, 50, 225])
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
