import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface StakeArgs {
  amount: BN
}

export interface StakeAccounts {
  farm: PublicKey
  farmer: PublicKey
  whitelistProof: PublicKey
  gemMint: PublicKey
  gemMetadata: PublicKey
  farmerVault: PublicKey
  gemOwnerAta: PublicKey
  stakeReceipt: PublicKey
  lock: PublicKey
  owner: PublicKey
  rent: PublicKey
  systemProgram: PublicKey
  tokenProgram: PublicKey
  associatedTokenProgram: PublicKey
}

export const layout = borsh.struct([borsh.u64("amount")])

export function stake(args: StakeArgs, accounts: StakeAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: true },
    { pubkey: accounts.farmer, isSigner: false, isWritable: true },
    { pubkey: accounts.whitelistProof, isSigner: false, isWritable: false },
    { pubkey: accounts.gemMint, isSigner: false, isWritable: false },
    { pubkey: accounts.gemMetadata, isSigner: false, isWritable: false },
    { pubkey: accounts.farmerVault, isSigner: false, isWritable: true },
    { pubkey: accounts.gemOwnerAta, isSigner: false, isWritable: true },
    { pubkey: accounts.stakeReceipt, isSigner: false, isWritable: true },
    { pubkey: accounts.lock, isSigner: false, isWritable: false },
    { pubkey: accounts.owner, isSigner: true, isWritable: true },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    {
      pubkey: accounts.associatedTokenProgram,
      isSigner: false,
      isWritable: false,
    },
  ]
  const identifier = Buffer.from([206, 176, 202, 18, 200, 209, 179, 108])
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
