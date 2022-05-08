import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";

import { NftabsStaking } from "../target/types/nftabs_staking";

describe("nftabs-staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.NftabsStaking as Program<NftabsStaking>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
