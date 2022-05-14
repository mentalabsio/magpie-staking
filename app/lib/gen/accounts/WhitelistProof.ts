import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface WhitelistProofFields {
  whitelistedAddress: PublicKey
  farm: PublicKey
  rewardRate: BN
  ty: types.WhitelistTypeKind
}

export interface WhitelistProofJSON {
  whitelistedAddress: string
  farm: string
  rewardRate: string
  ty: types.WhitelistTypeJSON
}

export class WhitelistProof {
  readonly whitelistedAddress: PublicKey
  readonly farm: PublicKey
  readonly rewardRate: BN
  readonly ty: types.WhitelistTypeKind

  static readonly discriminator = Buffer.from([
    194, 230, 60, 10, 60, 98, 236, 39,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("whitelistedAddress"),
    borsh.publicKey("farm"),
    borsh.u64("rewardRate"),
    types.WhitelistType.layout("ty"),
  ])

  constructor(fields: WhitelistProofFields) {
    this.whitelistedAddress = fields.whitelistedAddress
    this.farm = fields.farm
    this.rewardRate = fields.rewardRate
    this.ty = fields.ty
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
      whitelistedAddress: dec.whitelistedAddress,
      farm: dec.farm,
      rewardRate: dec.rewardRate,
      ty: types.WhitelistType.fromDecoded(dec.ty),
    })
  }

  toJSON(): WhitelistProofJSON {
    return {
      whitelistedAddress: this.whitelistedAddress.toString(),
      farm: this.farm.toString(),
      rewardRate: this.rewardRate.toString(),
      ty: this.ty.toJSON(),
    }
  }

  static fromJSON(obj: WhitelistProofJSON): WhitelistProof {
    return new WhitelistProof({
      whitelistedAddress: new PublicKey(obj.whitelistedAddress),
      farm: new PublicKey(obj.farm),
      rewardRate: new BN(obj.rewardRate),
      ty: types.WhitelistType.fromJSON(obj.ty),
    })
  }
}
