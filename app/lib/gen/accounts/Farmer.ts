import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface FarmerFields {
  farm: PublicKey;
  owner: PublicKey;
  accruedRewards: BN;
  totalRewardRate: BN;
  lastUpdate: BN;
  bump: Array<number>;
}

export interface FarmerJSON {
  farm: string;
  owner: string;
  accruedRewards: string;
  totalRewardRate: string;
  lastUpdate: string;
  bump: Array<number>;
}

export class Farmer {
  readonly farm: PublicKey;
  readonly owner: PublicKey;
  readonly accruedRewards: BN;
  readonly totalRewardRate: BN;
  readonly lastUpdate: BN;
  readonly bump: Array<number>;

  static readonly discriminator = Buffer.from([
    254, 63, 81, 98, 130, 38, 28, 219,
  ]);

  static readonly layout = borsh.struct([
    borsh.publicKey("farm"),
    borsh.publicKey("owner"),
    borsh.u64("accruedRewards"),
    borsh.u64("totalRewardRate"),
    borsh.u64("lastUpdate"),
    borsh.array(borsh.u8(), 1, "bump"),
  ]);

  constructor(fields: FarmerFields) {
    this.farm = fields.farm;
    this.owner = fields.owner;
    this.accruedRewards = fields.accruedRewards;
    this.totalRewardRate = fields.totalRewardRate;
    this.lastUpdate = fields.lastUpdate;
    this.bump = fields.bump;
  }

  static async fetch(
    c: Connection,
    address: PublicKey
  ): Promise<Farmer | null> {
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
  ): Promise<Array<Farmer | null>> {
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

  static decode(data: Buffer): Farmer {
    if (!data.slice(0, 8).equals(Farmer.discriminator)) {
      throw new Error("invalid account discriminator");
    }

    const dec = Farmer.layout.decode(data.slice(8));

    return new Farmer({
      farm: dec.farm,
      owner: dec.owner,
      accruedRewards: dec.accruedRewards,
      totalRewardRate: dec.totalRewardRate,
      lastUpdate: dec.lastUpdate,
      bump: dec.bump,
    });
  }

  toJSON(): FarmerJSON {
    return {
      farm: this.farm.toString(),
      owner: this.owner.toString(),
      accruedRewards: this.accruedRewards.toString(),
      totalRewardRate: this.totalRewardRate.toString(),
      lastUpdate: this.lastUpdate.toString(),
      bump: this.bump,
    };
  }

  static fromJSON(obj: FarmerJSON): Farmer {
    return new Farmer({
      farm: new PublicKey(obj.farm),
      owner: new PublicKey(obj.owner),
      accruedRewards: new BN(obj.accruedRewards),
      totalRewardRate: new BN(obj.totalRewardRate),
      lastUpdate: new BN(obj.lastUpdate),
      bump: obj.bump,
    });
  }
}
