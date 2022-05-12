import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface LockFields {
  farm: PublicKey
  duration: BN
  cooldown: BN
  bonusFactor: number
}

export interface LockJSON {
  farm: string
  duration: string
  cooldown: string
  bonusFactor: number
}

export class Lock {
  readonly farm: PublicKey
  readonly duration: BN
  readonly cooldown: BN
  readonly bonusFactor: number

  static readonly discriminator = Buffer.from([
    8, 255, 36, 202, 210, 22, 57, 137,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("farm"),
    borsh.u64("duration"),
    borsh.u64("cooldown"),
    borsh.u8("bonusFactor"),
  ])

  constructor(fields: LockFields) {
    this.farm = fields.farm
    this.duration = fields.duration
    this.cooldown = fields.cooldown
    this.bonusFactor = fields.bonusFactor
  }

  static async fetch(c: Connection, address: PublicKey): Promise<Lock | null> {
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
  ): Promise<Array<Lock | null>> {
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

  static decode(data: Buffer): Lock {
    if (!data.slice(0, 8).equals(Lock.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = Lock.layout.decode(data.slice(8))

    return new Lock({
      farm: dec.farm,
      duration: dec.duration,
      cooldown: dec.cooldown,
      bonusFactor: dec.bonusFactor,
    })
  }

  toJSON(): LockJSON {
    return {
      farm: this.farm.toString(),
      duration: this.duration.toString(),
      cooldown: this.cooldown.toString(),
      bonusFactor: this.bonusFactor,
    }
  }

  static fromJSON(obj: LockJSON): Lock {
    return new Lock({
      farm: new PublicKey(obj.farm),
      duration: new BN(obj.duration),
      cooldown: new BN(obj.cooldown),
      bonusFactor: obj.bonusFactor,
    })
  }
}
