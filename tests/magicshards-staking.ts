import * as anchor from "@project-serum/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import { StakingProgram } from "../app/lib";
import {
  WhitelistProof,
  Farm,
  Farmer,
  StakeReceipt,
} from "../app/lib/gen/accounts";
import { LockConfigFields } from "../app/lib/gen/types";
import {
  findFarmAddress,
  findFarmerAddress,
  findStakeReceiptAddress,
} from "../app/lib/pda";
import { findFarmLocks } from "../app/lib/utils";

describe("staking-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const stakingClient = StakingProgram(connection);

  // Farm creator.
  const farmAuthority = Keypair.generate();

  // NFT that will be staked.
  const nft = new PublicKey("SaCd2fYycnD2wcUJWZNfF2xGAVvcUaVeTnEz7MUibm5");
  // Whitelisted creator address.
  const creatorAddress = new PublicKey(
    "2foGcTHZ2C9c5xQrBopgLyNxQ33rdSxwDXqHJbv34Fvs"
  );

  const userWallet = anchor.web3.Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(
      "2YFHVfWEbNAFJtJ2z2ENTfZXcpD982ggcKvZtmKhUz3o7Tm1fS5JSDf4se2xxjjvj2ykqF4t6QnjRwGxznaN82Ru"
    )
  );

  let rewardMint: PublicKey;

  before(async () => {
    const { mint } = await createFungibleToken(connection, farmAuthority);
    rewardMint = mint;
  });

  it("should be able to create a new farm.", async () => {
    const { farm } = await stakingClient.createFarm({
      authority: farmAuthority,
      rewardMint,
    });

    const { authority, reward } = await Farm.fetch(connection, farm);

    expect(reward.reserved.toNumber()).to.equal(0);
    expect(reward.available.toNumber()).to.equal(0);
    expect(reward.mint).to.eql(rewardMint);
    expect(authority).to.eql(farmAuthority.publicKey);
  });

  it("should be able to create new locks for a farm", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const ONE_WEEK = new BN(60 * 60 * 24 * 7);

    const lockConfigs: LockConfigFields[] = [
      { duration: new BN(0), bonusFactor: 0, cooldown: new BN(0) },
      { duration: ONE_WEEK, bonusFactor: 25, cooldown: new BN(0) },
      { duration: ONE_WEEK.muln(2), bonusFactor: 50, cooldown: new BN(0) },
      { duration: ONE_WEEK.muln(4), bonusFactor: 75, cooldown: new BN(0) },
    ];

    await stakingClient.createLocks({
      farm,
      authority: farmAuthority,
      lockConfigs,
    });

    const locks = (await findFarmLocks(connection, farm)).map((acc) =>
      acc.toJSON()
    );

    // console.log(locks);

    expect(locks.length).to.be.equal(lockConfigs.length);
    expect(locks.every((lock) => lock.farm === farm.toBase58())).to.be.true;
  });

  it("should be able to fund a farm's rewards", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint: rewardMint,
    });

    await stakingClient.fundReward({
      farm,
      authority: farmAuthority,
      amount: new BN(100_000e9),
    });

    const farmAccount = await Farm.fetch(connection, farm);

    expect(farmAccount.reward.available.toNumber()).to.equal(100_000e9);
    expect(farmAccount.reward.reserved.toNumber()).to.equal(0);
  });

  it("should be able to whitelist a creator address", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { whitelistProof } = await stakingClient.addToWhitelist({
      creator: creatorAddress,
      authority: farmAuthority,
      farm,
      rewardRate: { tokenAmount: new BN(100), intervalInSeconds: new BN(1) },
    });

    const whitelistProofAccount = await WhitelistProof.fetch(
      connection,
      whitelistProof
    );

    expect(whitelistProofAccount.farm).to.eql(farm);
    expect(whitelistProofAccount.creator).to.eql(creatorAddress);
    expect(whitelistProofAccount.rewardRate.toNumber()).to.equal(100);
  });

  it("should be able to initialize a farmer", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { farmer } = await stakingClient.initializeFarmer({
      farm,
      owner: userWallet,
    });

    const { totalRewardRate, accruedRewards, owner } = await Farmer.fetch(
      connection,
      farmer
    );

    expect(totalRewardRate.toNumber()).to.equal(0);
    expect(accruedRewards.toNumber()).to.equal(0);
    expect(owner).to.eql(userWallet.publicKey);
  });

  it("should be able to stake a gem", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find((lock) => lock.bonusFactor === 0);

    await stakingClient.stake({
      farm,
      mint: nft,
      lock: lock.address,
      owner: userWallet,
      args: { amount: new BN(1) },
    });

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });

    const farmerAccount = await Farmer.fetch(connection, farmer);
    const { reward } = await Farm.fetch(connection, farm);

    const expectedRewardRate = Math.floor(100 * (1 + lock.bonusFactor / 100));
    const expectedReservedReward =
      expectedRewardRate * lock.duration.toNumber();

    expect(farmerAccount.totalRewardRate.toNumber()).to.equal(
      expectedRewardRate
    );

    expect(reward.reserved.toNumber()).to.equal(expectedReservedReward);

    expect(reward.available.toNumber()).to.equal(
      100_000e9 - expectedReservedReward
    );
  });

  it("should be able to unstake a gem", async () => {
    // Sleep for 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    await stakingClient.unstake({
      farm,
      mint: nft,
      owner: userWallet,
    });

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const stakeReceipt = findStakeReceiptAddress({ farmer, mint: nft });

    const farmerAccount = await Farmer.fetch(connection, farmer);
    const { endTs } = await StakeReceipt.fetch(connection, stakeReceipt);

    expect(farmerAccount.totalRewardRate.toNumber()).to.equal(0);
    expect(endTs.toNumber()).to.be.closeTo(Math.floor(Date.now() / 1000), 1);
  });

  it("should be able to claim rewards", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    await stakingClient.claimRewards({
      farm,
      authority: userWallet,
    });

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const farmerAccount = await Farmer.fetch(connection, farmer);

    expect(farmerAccount.accruedRewards.toNumber()).to.equal(0);
  });
});

// Creates and mints 1mi fungible tokens.
const createFungibleToken = async (
  connection: anchor.web3.Connection,
  payer: anchor.web3.Signer
): Promise<{
  payerAta: anchor.web3.PublicKey;
  mint: anchor.web3.PublicKey;
}> => {
  await connection.confirmTransaction(
    await connection.requestAirdrop(payer.publicKey, 1e9)
  );

  const mintAuthority = payer.publicKey;

  const mint = await createMint(connection, payer, mintAuthority, null, 9);

  const associatedAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    mintAuthority
  );

  await mintTo(
    connection,
    payer,
    mint,
    associatedAccount.address,
    mintAuthority,
    1_000_000e9
  );

  return {
    mint,
    payerAta: associatedAccount.address,
  };
};
