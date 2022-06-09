import { web3, BN } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { StakingProgram } from "lib";
import { Farmer, StakeReceipt } from "lib/gen/accounts";
import { fromTxError } from "lib/gen/errors";
import { findFarmAddress, findFarmerAddress } from "lib/pda";
import { findFarmLocks, findUserStakeReceipts } from "lib/utils";
import { useCallback, useEffect, useState } from "react";
import { getNFTMetadata } from "utils/nfts";
import { NFT } from "./useWalletNFTs";

const farmAuthorityPubKey = new web3.PublicKey(
  "CoE4yxLHMiR4PFpsVx6YkvQaDvEYV9p7Pc1tdTkJKhRJ"
);

const rewardMint = new web3.PublicKey(
  "7Q2Kp5RiW4Es3yz1iirPNeBrFYtdabCDz86pcjRUseeq"
);

export type StakeReceiptWithMetadata = StakeReceipt & {
  metadata: NFT;
};

const useStaking = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [farmerAccount, setFarmerAccount] = useState<Farmer | false | null>(
    null
  );

  const [stakeReceipts, setStakeReceipts] = useState<
    StakeReceiptWithMetadata[] | null
  >(null);

  const fetchReceipts = useCallback(async () => {
    if (publicKey) {
      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      });

      setFeedbackStatus("Fetching receipts...");
      const receipts = await findUserStakeReceipts(connection, farm, publicKey);

      const stakingReceipts = receipts.filter(
        (receipt) => receipt.endTs === null
      );

      setFeedbackStatus("Fetching metadatas...");
      const withMetadatas = await Promise.all(
        stakingReceipts.map(async (receipt) => {
          const metadata = await getNFTMetadata(
            receipt.mint.toString(),
            connection
          );

          const withMetadata = Object.assign(receipt, { metadata });

          return withMetadata;
        })
      );

      setStakeReceipts(withMetadatas);
      setFeedbackStatus("");
    }
  }, [publicKey]);

  const fetchFarmer = useCallback(async () => {
    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    setFeedbackStatus("Fetching farmer...");
    const farmer = findFarmerAddress({ farm, owner: publicKey });
    const farmerAccount = await Farmer.fetch(connection, farmer);

    if (!farmerAccount) {
      setFarmerAccount(false);

      return true;
    }

    setFarmerAccount(farmerAccount);
    setFeedbackStatus("");
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      fetchFarmer();
      fetchReceipts();
    }
  }, [publicKey]);

  const initFarmer = async () => {
    const stakingClient = StakingProgram(connection);

    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    setFeedbackStatus("Initializing transaction...");
    const { ix } = await stakingClient.createInitializeFarmerInstruction({
      farm,
      owner: publicKey,
    });

    const latest = await connection.getLatestBlockhash();
    const tx = new Transaction();

    tx.recentBlockhash = latest.blockhash;
    tx.add(ix);

    tx.feePayer = publicKey;

    setFeedbackStatus("Awaiting approval...");
    const txid = await sendTransaction(tx, connection);

    await connection.confirmTransaction(txid);

    setFeedbackStatus("Success!");

    await fetchFarmer();
  };

  const stakeAll = async (mints: web3.PublicKey[]) => {
    try {
      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      });

      setFeedbackStatus("Initializing...");
      const locks = await findFarmLocks(connection, farm);
      const lock = locks.find((lock) => lock.bonusFactor === 0);

      const stakingClient = StakingProgram(connection);

      let additionals = [];
      const ixs = await Promise.all(
        mints.map(async (mint) => {
          const { ix } = await stakingClient.createStakeInstruction({
            farm,
            mint,
            lock: lock.address,
            owner: publicKey,
            args: { amount: new BN(1) },
          });

          return ix;
        })
      );

      const tx = new Transaction();

      tx.add(...additionals, ...ixs);

      const latest = await connection.getLatestBlockhash();
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;

      setFeedbackStatus("Awaiting approval...");
      const txid = await sendTransaction(tx, connection);

      setFeedbackStatus("Confirming...");
      await connection.confirmTransaction(txid);

      console.log(txid);
    } catch (e) {
      console.log(e);
      const parsed = fromTxError(e);

      if (parsed) {
        console.log(parsed);
      }
    }
  };

  const unstake = async (mint: web3.PublicKey) => {
    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    const stakingClient = StakingProgram(connection);

    setFeedbackStatus("Initializing...");

    const { ix } = await stakingClient.createUnstakeInstruction({
      farm,
      mint,
      owner: publicKey,
    });

    const tx = new Transaction();

    tx.add(ix);
    const latest = await connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = publicKey;

    setFeedbackStatus("Awaiting approval...");

    const txid = await sendTransaction(tx, connection);

    setFeedbackStatus("Confirming...");

    await connection.confirmTransaction(txid);
  };

  const buffPair = async (
    nftA: web3.PublicKey,
    nftB: web3.PublicKey,
    buffMint: web3.PublicKey
  ) => {
    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    const stakingClient = StakingProgram(connection);

    const { ix } = await stakingClient.createBuffPairInstruction({
      farm,
      buffMint,
      pair: [nftA, nftB],
      authority: publicKey,
    });

    const tx = new Transaction();

    tx.add(ix);
    const latest = await connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = publicKey;

    setFeedbackStatus("Awaiting approval...");

    const txid = await sendTransaction(tx, connection);

    setFeedbackStatus("Confirming...");

    await connection.confirmTransaction(txid);

    setFeedbackStatus("Success!");
  };

  const debuffPair = async (
    nftA: web3.PublicKey,
    nftB: web3.PublicKey,
    buffMint: web3.PublicKey
  ) => {
    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    const stakingClient = StakingProgram(connection);

    const { ix } = await stakingClient.createDebuffPairInstruction({
      farm,
      buffMint,
      pair: [nftA, nftB],
      authority: publicKey,
    });

    const tx = new Transaction();

    tx.add(ix);
    const latest = await connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = publicKey;

    setFeedbackStatus("Awaiting approval...");

    const txid = await sendTransaction(tx, connection);

    setFeedbackStatus("Confirming...");

    await connection.confirmTransaction(txid);

    setFeedbackStatus("Success!");
  };

  const claim = async () => {
    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    const stakingClient = StakingProgram(connection);

    const { ix } = await stakingClient.createClaimRewardsInstruction({
      farm,
      authority: publicKey,
    });

    const latest = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction();

    tx.add(ix);
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = publicKey;

    setFeedbackStatus("Awaiting approval...");

    const txid = await sendTransaction(tx, connection);

    setFeedbackStatus("Confirming...");

    await connection.confirmTransaction(txid);

    setFeedbackStatus("Success!");
  };

  const stakeFungibleTokens = async () => {
    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    const locks = await findFarmLocks(connection, farm);
    const lock = locks.find((lock) => lock.bonusFactor === 0);

    const stakingClient = StakingProgram(connection);

    // Stake 0.5 tokens
    const { ix } = await stakingClient.createStakeInstruction({
      farm,
      mint: rewardMint,
      lock: lock.address,
      owner: publicKey,
      args: { amount: new BN(5e8) },
    });

    const tx = new Transaction();

    tx.add(ix);
    const latest = await connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = publicKey;

    setFeedbackStatus("Awaiting approval...");

    const txid = await sendTransaction(tx, connection);

    setFeedbackStatus("Confirming...");

    await connection.confirmTransaction(txid);

    setFeedbackStatus("Success!");
  };

  return {
    farmerAccount,
    feedbackStatus,
    claim,
    initFarmer,
    stakeAll,
    stakeReceipts,
    unstake,
    fetchReceipts,
    buffPair,
    debuffPair,
    stakeFungibleTokens,
  };
};

export default useStaking;
