use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::StakingError;
use crate::utils::{self, calculate_reward_rate, now_ts};

use crate::state::*;

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub farm: Account<'info, Farm>,

    #[account(
        mut,
        has_one = farm,
        has_one = owner,
        seeds = [
            Farmer::PREFIX,
            farm.key().as_ref(),
            owner.key().as_ref()
        ],
        bump,
    )]
    pub farmer: Account<'info, Farmer>,

    #[account(address = stake_receipt.mint)]
    pub gem_mint: Account<'info, Mint>,

    pub whitelist_proof: Account<'info, WhitelistProof>,

    #[account(
        mut,
        has_one = farmer,
        has_one = lock,
        seeds = [
            StakeReceipt::PREFIX,
            farmer.key().as_ref(),
            gem_mint.key().as_ref(),
        ],
        bump,
    )]
    pub stake_receipt: Account<'info, StakeReceipt>,

    #[account(has_one = farm)]
    pub lock: Account<'info, Lock>,

    #[account(
        mut,
        associated_token::mint = gem_mint,
        associated_token::authority = farmer,
    )]
    pub farmer_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = gem_mint,
        associated_token::authority = owner,
    )]
    pub gem_owner_ata: Box<Account<'info, TokenAccount>>,

    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> Unstake<'info> {
    pub fn release_gems(&self) -> Result<()> {
        let cpi_ctx = utils::transfer_spl_ctx(
            self.farmer_vault.to_account_info(),
            self.gem_owner_ata.to_account_info(),
            self.farmer.to_account_info(),
            self.token_program.to_account_info(),
        );

        anchor_spl::token::transfer(cpi_ctx.with_signer(&[&self.farmer.seeds()]), 1)
    }
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, Unstake<'info>>, amount: u64) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }

    WhitelistProof::validate(
        &ctx.accounts.whitelist_proof,
        &ctx.accounts.gem_mint,
        ctx.program_id,
        ctx.remaining_accounts,
    )?;

    let now = now_ts()?;
    let end_ts = ctx.accounts.stake_receipt.start_ts + ctx.accounts.lock.duration;

    require_gte!(now, end_ts, StakingError::GemStillLocked);

    let farm = &mut ctx.accounts.farm;

    ctx.accounts.farmer.update_accrued_rewards(farm)?;
    ctx.accounts.release_gems()?;

    let bonus_factor = ctx.accounts.lock.bonus_factor;
    let reward_rate = amount * ctx.accounts.whitelist_proof.reward_rate;
    let reward_rate = calculate_reward_rate(reward_rate, bonus_factor as u64)?;

    ctx.accounts.farmer.decrease_reward_rate(reward_rate)?;

    ctx.accounts.stake_receipt.end_ts = Some(now);

    Ok(())
}
