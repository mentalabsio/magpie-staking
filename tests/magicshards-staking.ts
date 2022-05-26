import * as anchor from "@project-serum/anchor";
import {
  transfer,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { assert, expect } from "chai";

import { StakingProgram } from "../app/lib";
import {
  WhitelistProof,
  Farm,
  Farmer,
  StakeReceipt,
} from "../app/lib/gen/accounts";
import { GemStillStaked } from "../app/lib/gen/errors/custom";
import { LockConfigFields, WhitelistType } from "../app/lib/gen/types";
import {
  findFarmAddress,
  findFarmerAddress,
  findStakeReceiptAddress,
  findWhitelistProofAddress,
} from "../app/lib/pda";
import { findFarmLocks, withParsedError } from "../app/lib/utils";

const send = (
  connection: Connection,
  ixs: TransactionInstruction[],
  signers: Signer[]
) => {
  const tx = new Transaction().add(...ixs);

  return withParsedError(sendAndConfirmTransaction)(connection, tx, signers);
};

describe("staking-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const stakingClient = StakingProgram(connection);

  // Farm creator.
  const farmAuthority = Keypair.generate();

  // NFTs that will be staked.
  const nft = new PublicKey("SaCd2fYycnD2wcUJWZNfF2xGAVvcUaVeTnEz7MUibm5");

  const otherNft = new PublicKey(
    "F8DBPPFwjddGdqs4EXdJTj3xqC8NE8FzUEzYQfMXt8Rs"
  );

  // Whitelisted creator address.
  const creatorAddress = new PublicKey(
    "2foGcTHZ2C9c5xQrBopgLyNxQ33rdSxwDXqHJbv34Fvs"
  );

  // NFT that will be used as a buff.
  const buffCreator = new PublicKey(
    "J1E9xvBsE8gwfV8qXVxbQ6H2wfEEKjRaxS2ENiZm4h2D"
  );
  const buffMint = new PublicKey(
    "Cfm3x9CXn1jDJK2k67h3KiDMWSxerKCqf4ZHZF9ydPq2"
  );

  const userWallet = anchor.web3.Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(
      "2YFHVfWEbNAFJtJ2z2ENTfZXcpD982ggcKvZtmKhUz3o7Tm1fS5JSDf4se2xxjjvj2ykqF4t6QnjRwGxznaN82Ru"
    )
  );

  let rewardMint: PublicKey;

  before(async () => {
    // Create new fungible token and mint to farmAuthority.
    const { mint } = await createFungibleToken(connection, farmAuthority);

    // Send tokens to user wallet.
    await transferToken(connection, mint, farmAuthority, userWallet.publicKey);

    rewardMint = mint;
  });

  it("should be able to create a new farm.", async () => {
    const { ix } = await stakingClient.createCreateFarmInstruction({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    await send(connection, ix, [farmAuthority]);

    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
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

    const { ix } = await stakingClient.createCreateLocksInstruction({
      farm,
      authority: farmAuthority.publicKey,
      lockConfigs,
    });

    await send(connection, [ix], [farmAuthority]);

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

    const { ix } = await stakingClient.createFundRewardInstruction({
      farm,
      authority: farmAuthority.publicKey,
      amount: new BN(100_000e9),
    });

    await send(connection, [ix], [farmAuthority]);

    const farmAccount = await Farm.fetch(connection, farm);

    expect(farmAccount.reward.available.toNumber()).to.equal(100_000e9);
    expect(farmAccount.reward.reserved.toNumber()).to.equal(0);
  });

  it("should be able to whitelist a creator address", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const whitelistBuff = await stakingClient.createAddToWhitelistInstruction({
      farm,
      authority: farmAuthority.publicKey,
      // Since this is a buff, the rewardRate will act as a multiplier.
      // Here it will buff the pair reward in 2x.
      rewardRate: { tokenAmount: new BN(2), intervalInSeconds: new BN(1) },
      creatorOrMint: buffCreator,
      whitelistType: new WhitelistType.Buff(),
    });

    const whitelistCreator =
      await stakingClient.createAddToWhitelistInstruction({
        creatorOrMint: creatorAddress,
        authority: farmAuthority.publicKey,
        farm,
        rewardRate: { tokenAmount: new BN(100), intervalInSeconds: new BN(1) },
        whitelistType: new WhitelistType.Creator(),
      });

    await send(
      connection,
      [whitelistBuff.ix, whitelistCreator.ix],
      [farmAuthority]
    );

    const whitelistProof = findWhitelistProofAddress({
      farm,
      creatorOrMint: creatorAddress,
    });

    const whitelistProofAccount = await WhitelistProof.fetch(
      connection,
      whitelistProof
    );

    expect(whitelistProofAccount.farm).to.eql(farm);
    expect(whitelistProofAccount.whitelistedAddress).to.eql(creatorAddress);
    expect(whitelistProofAccount.ty.kind).to.equal("Creator");
    expect(whitelistProofAccount.rewardRate.toNumber()).to.equal(100);
  });

  it("should be able to whitelist a mint address", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { ix } = await stakingClient.createAddToWhitelistInstruction({
      creatorOrMint: rewardMint,
      authority: farmAuthority.publicKey,
      farm,
      rewardRate: { tokenAmount: new BN(1), intervalInSeconds: new BN(1) },
      whitelistType: new WhitelistType.Mint(),
    });

    await send(connection, [ix], [farmAuthority]);

    const whitelistProof = findWhitelistProofAddress({
      farm,
      creatorOrMint: rewardMint,
    });

    const whitelistProofAccount = await WhitelistProof.fetch(
      connection,
      whitelistProof
    );

    expect(whitelistProofAccount.farm).to.eql(farm);
    expect(whitelistProofAccount.whitelistedAddress).to.eql(rewardMint);
    expect(whitelistProofAccount.rewardRate.toNumber()).to.equal(1);
  });

  it("should be able to initialize a farmer", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { ix } = await stakingClient.createInitializeFarmerInstruction({
      farm,
      owner: userWallet.publicKey,
    });

    await send(connection, [ix], [userWallet]);

    const farmer = findFarmerAddress({
      farm,
      owner: userWallet.publicKey,
    });

    const { totalRewardRate, accruedRewards, owner } = await Farmer.fetch(
      connection,
      farmer
    );

    expect(totalRewardRate.toNumber()).to.equal(0);
    expect(accruedRewards.toNumber()).to.equal(0);
    expect(owner).to.eql(userWallet.publicKey);
  });

  it("should be able to stake an NFT", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find((lock) => lock.bonusFactor === 0);

    const { ix } = await stakingClient.createStakeInstruction({
      farm,
      mint: nft,
      lock: lock.address,
      owner: userWallet.publicKey,
      args: { amount: new BN(1) },
    });

    await send(connection, [ix], [userWallet]);

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

  it("should be able to buff a pair", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find((lock) => lock.bonusFactor === 0);

    const stakeNft = await stakingClient.createStakeInstruction({
      farm,
      owner: userWallet.publicKey,
      mint: otherNft,
      lock: lock.address,
      args: { amount: new BN(1) },
    });

    const { ix } = await stakingClient.createBuffPairInstruction({
      farm,
      buffMint,
      pair: [nft, otherNft],
      authority: userWallet.publicKey,
    });

    await send(connection, [stakeNft.ix, ix], [farmAuthority, userWallet]);

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const farmerAccount = await Farmer.fetch(connection, farmer);

    expect(farmerAccount.totalRewardRate.toNumber()).to.equal(400);
  });

  it("should be able to debuff a pair", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { ix } = await stakingClient.createDebuffPairInstruction({
      farm,
      buffMint,
      pair: [nft, otherNft],
      authority: userWallet.publicKey,
    });

    const unstakeOtherNft = await stakingClient.createUnstakeInstruction({
      farm,
      owner: userWallet.publicKey,
      mint: otherNft,
    });

    await send(connection, [ix, unstakeOtherNft.ix], [userWallet]);

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const farmerAccount = await Farmer.fetch(connection, farmer);

    expect(farmerAccount.totalRewardRate.toNumber()).to.equal(100);
  });

  it("should be able to unstake an NFT", async () => {
    // Sleep for 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });

    const { ix } = await stakingClient.createUnstakeInstruction({
      farm,
      mint: nft,
      owner: userWallet.publicKey,
    });

    await send(connection, [ix], [userWallet]);

    const stakeReceipt = findStakeReceiptAddress({ farmer, mint: nft });

    const { totalRewardRate } = await Farmer.fetch(connection, farmer);
    const { endTs } = await StakeReceipt.fetch(connection, stakeReceipt);

    expect(totalRewardRate.toNumber()).to.equal(0);
    expect(endTs.toNumber()).to.be.closeTo(Math.floor(Date.now() / 1000), 1);
  });

  it("should be able to stake a fungible token", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find((lock) => lock.bonusFactor === 0);

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });

    // Stake 0.5 tokens
    const { ix } = await stakingClient.createStakeInstruction({
      farm,
      mint: rewardMint,
      lock: lock.address,
      owner: userWallet.publicKey,
      args: { amount: new BN(5e8) },
    });

    await send(connection, [ix], [userWallet]);

    const { totalRewardRate } = await Farmer.fetch(connection, farmer);
    const expectedRewardRate = 5e8 * Math.floor(1 + lock.bonusFactor / 100);

    expect(totalRewardRate.toNumber()).to.eql(expectedRewardRate);
  });

  it("should not be able to stake more while still staking", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find((lock) => lock.bonusFactor === 0);

    try {
      const { ix } = await stakingClient.createStakeInstruction({
        farm,
        mint: rewardMint,
        lock: lock.address,
        owner: userWallet.publicKey,
        args: { amount: new BN(5e8) },
      });

      await send(connection, [ix], [userWallet]);
      assert(false);
    } catch (e) {
      expect(e).to.be.instanceOf(GemStillStaked);
    }
  });

  it("should be able to remove and address from the whitelist", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { ix } = stakingClient.createRemoveFromWhitelistInstruction({
      farm,
      authority: farmAuthority.publicKey,
      addressToRemove: rewardMint,
    });

    await send(connection, [ix], [farmAuthority]);

    const whitelistProof = findWhitelistProofAddress({
      farm,
      creatorOrMint: rewardMint,
    });
    const whitelistProofAccount = await WhitelistProof.fetch(
      connection,
      whitelistProof
    );

    expect(whitelistProofAccount).to.be.null;
  });

  it("should be able to unstake a fungible token", async () => {
    // Sleep for 2 seconds so the rewards get updated.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { ix } = await stakingClient.createUnstakeInstruction({
      farm,
      mint: rewardMint,
      owner: userWallet.publicKey,
    });

    await send(connection, [ix], [userWallet]);

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const stakeReceipt = findStakeReceiptAddress({ farmer, mint: rewardMint });

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

    const { ix } = await stakingClient.createClaimRewardsInstruction({
      farm,
      authority: userWallet.publicKey,
    });

    await send(connection, [ix], [userWallet]);

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const farmerAccount = await Farmer.fetch(connection, farmer);

    expect(farmerAccount.accruedRewards.toNumber()).to.equal(0);
  });
});

// Creates and mints 1mi fungible tokens.
const createFungibleToken = async (
  connection: anchor.web3.Connection,
  payer: anchor.web3.Signer
): Promise<{ mint: anchor.web3.PublicKey }> => {
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

  return { mint };
};

const transferToken = async (
  connection: anchor.web3.Connection,
  mint: anchor.web3.PublicKey,
  sender: anchor.web3.Signer,
  receiver: anchor.web3.PublicKey
) => {
  const source = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mint,
    sender.publicKey
  );

  const destination = await getOrCreateAssociatedTokenAccount(
    connection,
    sender,
    mint,
    receiver
  );

  await transfer(
    connection,
    sender,
    source.address,
    destination.address,
    sender,
    100_000e9
  );
};
