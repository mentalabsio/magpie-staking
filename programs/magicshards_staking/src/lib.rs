use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

#[program]
pub mod magicshards_staking {
    use super::*;

    pub fn create_farm(ctx: Context<CreateFarm>) -> Result<()> {
        instructions::create_farm::handler(ctx)
    }

    pub fn add_manager(ctx: Context<AddManager>) -> Result<()> {
        instructions::add_manager::handler(ctx)
    }

    pub fn add_to_whitelist(ctx: Context<AddToWhitelist>, reward_rate: u64) -> Result<()> {
        instructions::add_to_whitelist::handler(ctx, reward_rate)
    }

    // Having this funcionality is quite tricky, since removing a whitelist would block the
    // unstaking of any NFT's from that collection. Ideally, for this case, we shouldn't need a
    // whitelist proof when unstaking. But that just ain't possible for now.
    //
    // pub fn remove_from_whitelist(ctx: Context<RemoveFromWhitelist>) -> Result<()> {
    //     instructions::remove_from_whitelist::handler(ctx)
    // }

    pub fn fund_reward(ctx: Context<FundReward>, amount: u64) -> Result<()> {
        instructions::fund_reward::handler(ctx, amount)
    }

    pub fn create_locks<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateLocks<'info>>,
        lock_configs: Vec<LockConfig>,
    ) -> Result<()> {
        instructions::create_locks::handler(ctx, lock_configs)
    }

    pub fn initialize_farmer(ctx: Context<InitializeFarmer>) -> Result<()> {
        instructions::initialize_farmer::handler(ctx)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        instructions::stake::handler(ctx, amount)
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        instructions::unstake::handler(ctx, amount)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::handler(ctx)
    }
}
