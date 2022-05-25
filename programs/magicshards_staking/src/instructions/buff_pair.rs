use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, Transfer},
};

use crate::{error::StakingError, state::*};

#[derive(Accounts)]
pub struct BuffPair<'info> {
    #[account(mut)]
    pub farm: Account<'info, Farm>,

    #[account(mut, has_one = farm)]
    pub farmer: Account<'info, Farmer>,

    pub buff_mint: Account<'info, Mint>,

    #[account(
        constraint =
            buff_whitelist.ty == WhitelistType::Buff
            @ StakingError::InvalidWhitelistType
    )]
    pub buff_whitelist: Account<'info, WhitelistProof>,

    #[account(
        mut,
        associated_token::authority = authority,
        associated_token::mint = buff_mint,
    )]
    pub buff_user_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::authority = farmer,
        associated_token::mint = buff_mint,
    )]
    pub buff_vault: Box<Account<'info, TokenAccount>>,

    pub mint_a: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
          StakeReceipt::PREFIX,
          farmer.key().as_ref(),
          mint_a.key().as_ref(),
        ],
        bump,
    )]
    pub mint_a_receipt: Box<Account<'info, StakeReceipt>>,

    pub mint_b: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [
          StakeReceipt::PREFIX,
          farmer.key().as_ref(),
          mint_b.key().as_ref(),
        ],
        bump,
    )]
    pub mint_b_receipt: Box<Account<'info, StakeReceipt>>,

    #[account(mut, address = farmer.owner)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> BuffPair<'info> {
    pub fn lock_buff(&self) -> Result<()> {
        let ctx = CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.buff_user_ata.to_account_info(),
                to: self.buff_vault.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        );

        anchor_spl::token::transfer(ctx, 1)
    }
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, BuffPair<'info>>) -> Result<()> {
    WhitelistProof::validate(
        &ctx.accounts.buff_whitelist,
        &ctx.accounts.buff_mint,
        ctx.program_id,
        ctx.remaining_accounts,
    )?;

    let buff_key = ctx.accounts.buff_mint.key();
    let buff_factor = ctx.accounts.buff_whitelist.reward_rate;

    let mint_a_increment = ctx
        .accounts
        .mint_a_receipt
        .try_buff(buff_key, buff_factor)?;

    let mint_b_increment = ctx
        .accounts
        .mint_b_receipt
        .try_buff(buff_key, buff_factor)?;

    ctx.accounts.lock_buff()?;

    let increment = mint_a_increment
        .checked_add(mint_b_increment)
        .ok_or(StakingError::ArithmeticError)?;

    let farm = &mut ctx.accounts.farm;
    ctx.accounts.farmer.update_accrued_rewards(farm)?;

    farm.reward.try_reserve(increment)?;
    ctx.accounts.farmer.increase_reward_rate(increment)?;

    Ok(())
}
