import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface StakeReceiptFields {
  farmer: PublicKey
  mint: PublicKey
  lock: PublicKey
  startTs: BN
  endTs: BN | null
}

export interface StakeReceiptJSON {
  farmer: string
  mint: string
  lock: string
  startTs: string
  endTs: string | null
}

export class StakeReceipt {
  readonly farmer: PublicKey
  readonly mint: PublicKey
  readonly lock: PublicKey
  readonly startTs: BN
  readonly endTs: BN | null

  static readonly discriminator = Buffer.from([
    189, 110, 129, 87, 79, 225, 96, 177,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("farmer"),
    borsh.publicKey("mint"),
    borsh.publicKey("lock"),
    borsh.u64("startTs"),
    borsh.option(borsh.u64(), "endTs"),
  ])

  constructor(fields: StakeReceiptFields) {
    this.farmer = fields.farmer
    this.mint = fields.mint
    this.lock = fields.lock
    this.startTs = fields.startTs
    this.endTs = fields.endTs
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<StakeReceipt | null> {
    const info = await c.getAccountInfo(address)

    if (info === null) {
      return null
    }
    if (!info.owner.equals(PROGRAM_ID)) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(info.data)
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[]
  ): Promise<Array<StakeReceipt | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses)

    return infos.map((info) => {
      if (info === null) {
        return null
      }
      if (!info.owner.equals(PROGRAM_ID)) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(info.data)
    })
  }

  static decode(data: Buffer): StakeReceipt {
    if (!data.slice(0, 8).equals(StakeReceipt.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = StakeReceipt.layout.decode(data.slice(8))

    return new StakeReceipt({
      farmer: dec.farmer,
      mint: dec.mint,
      lock: dec.lock,
      startTs: dec.startTs,
      endTs: dec.endTs,
    })
  }

  toJSON(): StakeReceiptJSON {
    return {
      farmer: this.farmer.toString(),
      mint: this.mint.toString(),
      lock: this.lock.toString(),
      startTs: this.startTs.toString(),
      endTs: (this.endTs && this.endTs.toString()) || null,
    }
  }

  static fromJSON(obj: StakeReceiptJSON): StakeReceipt {
    return new StakeReceipt({
      farmer: new PublicKey(obj.farmer),
      mint: new PublicKey(obj.mint),
      lock: new PublicKey(obj.lock),
      startTs: new BN(obj.startTs),
      endTs: (obj.endTs && new BN(obj.endTs)) || null,
    })
  }
}
