import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface WhitelistProofFields {
  creator: PublicKey
  farm: PublicKey
  rewardRate: BN
}

export interface WhitelistProofJSON {
  creator: string
  farm: string
  rewardRate: string
}

export class WhitelistProof {
  readonly creator: PublicKey
  readonly farm: PublicKey
  readonly rewardRate: BN

  static readonly discriminator = Buffer.from([
    194, 230, 60, 10, 60, 98, 236, 39,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("creator"),
    borsh.publicKey("farm"),
    borsh.u64("rewardRate"),
  ])

  constructor(fields: WhitelistProofFields) {
    this.creator = fields.creator
    this.farm = fields.farm
    this.rewardRate = fields.rewardRate
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<WhitelistProof | null> {
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
  ): Promise<Array<WhitelistProof | null>> {
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

  static decode(data: Buffer): WhitelistProof {
    if (!data.slice(0, 8).equals(WhitelistProof.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = WhitelistProof.layout.decode(data.slice(8))

    return new WhitelistProof({
      creator: dec.creator,
      farm: dec.farm,
      rewardRate: dec.rewardRate,
    })
  }

  toJSON(): WhitelistProofJSON {
    return {
      creator: this.creator.toString(),
      farm: this.farm.toString(),
      rewardRate: this.rewardRate.toString(),
    }
  }

  static fromJSON(obj: WhitelistProofJSON): WhitelistProof {
    return new WhitelistProof({
      creator: new PublicKey(obj.creator),
      farm: new PublicKey(obj.farm),
      rewardRate: new BN(obj.rewardRate),
    })
  }
}
