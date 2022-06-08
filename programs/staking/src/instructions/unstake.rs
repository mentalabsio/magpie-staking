use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::StakingError;
use crate::utils::{self, now_ts};

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
    pub fn release_gems(&self, amount: u64) -> Result<()> {
        let cpi_ctx = utils::transfer_spl_ctx(
            self.farmer_vault.to_account_info(),
            self.gem_owner_ata.to_account_info(),
            self.farmer.to_account_info(),
            self.token_program.to_account_info(),
        );

        anchor_spl::token::transfer(cpi_ctx.with_signer(&[&self.farmer.seeds()]), amount)
    }
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, Unstake<'info>>) -> Result<()> {
    let now = now_ts()?;
    let end_ts = ctx
        .accounts
        .stake_receipt
        .start_ts
        .checked_add(ctx.accounts.lock.duration)
        .ok_or(StakingError::ArithmeticError)?;

    let farm = &mut ctx.accounts.farm;
    let receipt = &ctx.accounts.stake_receipt;

    require_gte!(now, end_ts, StakingError::GemStillLocked);

    ctx.accounts.farmer.update_accrued_rewards(farm)?;
    ctx.accounts.release_gems(receipt.amount)?;
    ctx.accounts
        .farmer
        .decrease_reward_rate(receipt.reward_rate)?;

    ctx.accounts.stake_receipt.end_ts = Some(now);

    Ok(())
}
