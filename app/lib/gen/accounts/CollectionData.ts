import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface CollectionDataFields {
  creator: PublicKey;
  farm: PublicKey;
  rewardRate: BN;
}

export interface CollectionDataJSON {
  creator: string;
  farm: string;
  rewardRate: string;
}

export class CollectionData {
  readonly creator: PublicKey;
  readonly farm: PublicKey;
  readonly rewardRate: BN;

  static readonly discriminator = Buffer.from([
    169, 122, 6, 181, 220, 218, 199, 96,
  ]);

  static readonly layout = borsh.struct([
    borsh.publicKey("creator"),
    borsh.publicKey("farm"),
    borsh.u64("rewardRate"),
  ]);

  constructor(fields: CollectionDataFields) {
    this.creator = fields.creator;
    this.farm = fields.farm;
    this.rewardRate = fields.rewardRate;
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<CollectionData | null> {
    const info = await c.getAccountInfo(address);

    if (info === null) {
      return null;
    }
    if (!info.owner.equals(PROGRAM_ID)) {
      throw new Error("account doesn't belong to this program");
    }

    return this.decode(info.data);
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[]
  ): Promise<Array<CollectionData | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses);

    return infos.map((info) => {
      if (info === null) {
        return null;
      }
      if (!info.owner.equals(PROGRAM_ID)) {
        throw new Error("account doesn't belong to this program");
      }

      return this.decode(info.data);
    });
  }

  static decode(data: Buffer): CollectionData {
    if (!data.slice(0, 8).equals(CollectionData.discriminator)) {
      throw new Error("invalid account discriminator");
    }

    const dec = CollectionData.layout.decode(data.slice(8));

    return new CollectionData({
      creator: dec.creator,
      farm: dec.farm,
      rewardRate: dec.rewardRate,
    });
  }

  toJSON(): CollectionDataJSON {
    return {
      creator: this.creator.toString(),
      farm: this.farm.toString(),
      rewardRate: this.rewardRate.toString(),
    };
  }

  static fromJSON(obj: CollectionDataJSON): CollectionData {
    return new CollectionData({
      creator: new PublicKey(obj.creator),
      farm: new PublicKey(obj.farm),
      rewardRate: new BN(obj.rewardRate),
    });
  }
}
