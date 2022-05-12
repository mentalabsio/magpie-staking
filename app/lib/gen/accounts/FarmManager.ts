import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface FarmManagerFields {
  farm: PublicKey
  authority: PublicKey
}

export interface FarmManagerJSON {
  farm: string
  authority: string
}

export class FarmManager {
  readonly farm: PublicKey
  readonly authority: PublicKey

  static readonly discriminator = Buffer.from([
    140, 111, 131, 135, 218, 198, 198, 200,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("farm"),
    borsh.publicKey("authority"),
  ])

  constructor(fields: FarmManagerFields) {
    this.farm = fields.farm
    this.authority = fields.authority
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<FarmManager | null> {
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
  ): Promise<Array<FarmManager | null>> {
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

  static decode(data: Buffer): FarmManager {
    if (!data.slice(0, 8).equals(FarmManager.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = FarmManager.layout.decode(data.slice(8))

    return new FarmManager({
      farm: dec.farm,
      authority: dec.authority,
    })
  }

  toJSON(): FarmManagerJSON {
    return {
      farm: this.farm.toString(),
      authority: this.authority.toString(),
    }
  }

  static fromJSON(obj: FarmManagerJSON): FarmManager {
    return new FarmManager({
      farm: new PublicKey(obj.farm),
      authority: new PublicKey(obj.authority),
    })
  }
}
