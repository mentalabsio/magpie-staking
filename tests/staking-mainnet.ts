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
import { WhitelistType } from "../app/lib/gen/types";
import { LockConfigFields } from "../app/lib/gen/types/LockConfig";
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

describe("magpie-staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const stakingClient = StakingProgram(connection);

  // Farm creator.
  const farmAuthority = Keypair.fromSecretKey(
    new Uint8Array([
      70, 235, 141, 166, 91, 119, 194, 105, 6, 32, 182, 53, 72, 22, 238, 54,
      133, 171, 52, 173, 15, 181, 112, 76, 62, 107, 123, 247, 205, 27, 68, 99,
      150, 192, 6, 126, 225, 43, 244, 25, 73, 179, 164, 247, 243, 52, 113, 205,
      120, 179, 11, 151, 78, 25, 96, 24, 100, 38, 72, 101, 227, 176, 104, 207,
    ])
  );

  // NFTs that will be staked.
  const nft = new PublicKey("SaCd2fYycnD2wcUJWZNfF2xGAVvcUaVeTnEz7MUibm5");

  // Whitelisted creator address.
  const creatorAddress = new PublicKey(
    "9UaTjLVUTtJF3n9sG8VfvYt4pdYGf7Y59qYZFBRx4kLo"
  );

  // NFT that will be used as an object.
  const objectMint = new PublicKey(
    "Cfm3x9CXn1jDJK2k67h3KiDMWSxerKCqf4ZHZF9ydPq2"
  );

  const objectCreator = new PublicKey(
    "62vz2oMLFf6k4DcX23tA6hR4ixDGUVxqk4gJf7iCGiEx"
  );

  const userWallet = anchor.web3.Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(
      "2YFHVfWEbNAFJtJ2z2ENTfZXcpD982ggcKvZtmKhUz3o7Tm1fS5JSDf4se2xxjjvj2ykqF4t6QnjRwGxznaN82Ru"
    )
  );

  let rewardMint: anchor.web3.PublicKey = new anchor.web3.PublicKey(
    "MM7s2bggZvq2DBFyBVKBBHb9DYAo3A2WGkP6L5cPzxC"
  );

  console.log(farmAuthority.publicKey.toString());

  // before(async () => {
  //   // Create new fungible token and mint to farmAuthority.
  //   const { mint } = await createFungibleToken(connection, farmAuthority);

  //   // Send tokens to user wallet.
  //   await transferToken(connection, mint, farmAuthority, userWallet.publicKey);

  //   rewardMint = mint;
  //   console.log(rewardMint.toString());
  // });

  it.skip("should be able to create a new farm.", async () => {
    const { ix } = await stakingClient.createFarmInstruction({
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
    expect(reward.mint.toString()).to.eql(rewardMint.toString());
    expect(authority.toString()).to.eql(farmAuthority.publicKey.toString());
  });

  it.skip("should be able to create new locks for a farm", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const ONE_WEEK = new BN(60 * 60 * 24 * 7);

    const lockConfigs: LockConfigFields[] = [
      { duration: new BN(0), bonusFactor: 0, cooldown: new BN(0) },
      // { duration: ONE_WEEK, bonusFactor: 25, cooldown: new BN(0) },
      // { duration: ONE_WEEK.muln(2), bonusFactor: 50, cooldown: new BN(0) },
      // { duration: ONE_WEEK.muln(4), bonusFactor: 75, cooldown: new BN(0) },
    ];

    const { ix } = await stakingClient.createCreateLocksInstruction({
      farm,
      authority: farmAuthority.publicKey,
      lockConfigs,
    });

    await send(connection, [ix], [farmAuthority]);

    const locks = (await findFarmLocks(connection, farm)).map(acc =>
      acc.toJSON()
    );

    // console.log(locks);

    expect(locks.length).to.be.equal(lockConfigs.length);
    expect(locks.every(lock => lock.farm === farm.toBase58())).to.be.true;
  });

  it("should be able to fund a farm's rewards", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint: rewardMint,
    });

    const { ix } = await stakingClient.createFundRewardInstruction({
      farm,
      authority: farmAuthority.publicKey,
      amount: new BN(700e6),
    });

    await send(connection, [ix], [farmAuthority]);

    const farmAccount = await Farm.fetch(connection, farm);

    expect(farmAccount.reward.available.toNumber()).to.equal(700e6);
    expect(farmAccount.reward.reserved.toNumber()).to.equal(0);
  });

  it.skip("should be able to whitelist a creator address", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    // 5 tokens/day
    // const objectRewardRate = {
    //   intervalInSeconds: new BN(86_400),
    //   tokenAmount: new BN(5e6),
    // };

    // const whitelistObject = await stakingClient.createAddToWhitelistInstruction(
    //   {
    //     farm,
    //     authority: farmAuthority.publicKey,
    //     rewardRate: objectRewardRate,
    //     creatorOrMint: objectCreator,
    //     whitelistType: new WhitelistType.AssociatedObject(),
    //   }
    // );

    const whitelistCreator =
      await stakingClient.createAddToWhitelistInstruction({
        creatorOrMint: creatorAddress,
        authority: farmAuthority.publicKey,
        farm,
        rewardRate: {
          tokenAmount: new BN(24e6),
          intervalInSeconds: new BN(86_400),
        },
        whitelistType: new WhitelistType.Creator(),
      });

    await send(
      connection,
      [whitelistCreator.ix /*, whitelistObject.ix */],
      [farmAuthority]
    );

    // const objectWhitelist = findWhitelistProofAddress({
    //   farm,
    //   creatorOrMint: objectCreator,
    // });

    // const objectWhitelistAccount = await WhitelistProof.fetch(
    //   connection,
    //   objectWhitelist
    // );

    const creatorWhitelist = findWhitelistProofAddress({
      farm,
      creatorOrMint: creatorAddress,
    });

    const creatorWhitelistAccount = await WhitelistProof.fetch(
      connection,
      creatorWhitelist
    );

    expect(creatorWhitelistAccount.farm.toString()).to.eql(farm.toString());
    expect(creatorWhitelistAccount.whitelistedAddress.toString()).to.eql(
      creatorAddress.toString()
    );
    expect(creatorWhitelistAccount.ty.kind).to.equal("Creator");
    expect(creatorWhitelistAccount.rewardRate.toNumber()).to.equal(100);

    // expect(objectWhitelistAccount.ty.kind).to.equal("AssociatedObject");
    // expect(objectWhitelistAccount.rewardRate.toNumber()).to.equal(57);
    // expect(objectWhitelistAccount.whitelistedAddress.toString()).to.eql(
    //   objectCreator.toString()
    // );
  });

  it.skip("should be able to whitelist a mint address", async () => {
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

    expect(whitelistProofAccount.farm.toString()).to.eql(farm.toString());
    expect(whitelistProofAccount.whitelistedAddress.toString()).to.eql(
      rewardMint.toString()
    );
    expect(whitelistProofAccount.rewardRate.toNumber()).to.equal(1);
  });

  it.skip("should be able to initialize a farmer", async () => {
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
    expect(owner.toString()).to.eql(userWallet.publicKey.toString());
  });

  it.skip("should be able to stake an NFT", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find(lock => lock.bonusFactor === 0);

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

  it.skip("should be able to add an object", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { ix } = await stakingClient.createAddObjectInstruction({
      farm,
      mint: nft,
      object: objectMint,
      owner: userWallet.publicKey,
    });

    await send(connection, [ix], [userWallet]);

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const receipt = findStakeReceiptAddress({ farmer, mint: nft });

    const receiptAccount = await StakeReceipt.fetch(connection, receipt);

    expect(receiptAccount.rewardRate.toNumber()).to.equal(157);
    expect(receiptAccount.objects.length).to.equal(1);
    expect(receiptAccount.objects.some(o => o.key.equals(objectMint))).to.be
      .true;
  });

  it.skip("should be able to remove an object", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const { ix } = await stakingClient.createRemoveObjectInstruction({
      farm,
      mint: nft,
      object: objectMint,
      owner: userWallet.publicKey,
    });

    await send(connection, [ix], [userWallet]);

    const farmer = findFarmerAddress({ farm, owner: userWallet.publicKey });
    const receipt = findStakeReceiptAddress({ farmer, mint: nft });

    const receiptAccount = await StakeReceipt.fetch(connection, receipt);

    expect(receiptAccount.rewardRate.toNumber()).to.equal(100);
    expect(receiptAccount.objects.length).to.equal(0);
    expect(receiptAccount.objects.some(o => o.key.equals(objectMint))).to.be
      .false;
  });

  it.skip("should be able to unstake an NFT", async () => {
    // Sleep for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

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

  it.skip("should be able to stake a fungible token", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find(lock => lock.bonusFactor === 0);

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

  it.skip("should not be able to stake more while still staking", async () => {
    const farm = findFarmAddress({
      authority: farmAuthority.publicKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find(lock => lock.bonusFactor === 0);

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

  it.skip("should be able to remove and address from the whitelist", async () => {
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

  it.skip("should be able to unstake a fungible token", async () => {
    // Sleep for 2 seconds so the rewards get updated.
    await new Promise(resolve => setTimeout(resolve, 2000));

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

  it.skip("should be able to claim rewards", async () => {
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
