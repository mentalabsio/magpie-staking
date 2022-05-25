use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

use crate::{error::StakingError, state::*};

#[derive(Accounts)]
pub struct DebuffPair<'info> {
    #[account(mut)]
    pub farm: Account<'info, Farm>,

    #[account(mut, has_one = farm)]
    pub farmer: Account<'info, Farmer>,

    pub buff_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::authority = authority,
        associated_token::mint = buff_mint,
    )]
    pub buff_user_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::authority = farmer,
        associated_token::mint = buff_mint,
    )]
    pub buff_vault: Box<Account<'info, TokenAccount>>,

    pub mint_a: Account<'info, Mint>,

    #[account(
        mut,
        constraint = matches!(mint_a_receipt.buff, Some(Buff{ key: buff_mint, ..})),
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
        constraint = matches!(mint_b_receipt.buff, Some(Buff{ key: buff_mint, ..})),
        seeds = [
          StakeReceipt::PREFIX,
          farmer.key().as_ref(),
          mint_b.key().as_ref(),
        ],
        bump,
    )]
    pub mint_b_receipt: Box<Account<'info, StakeReceipt>>,

    #[account(address = farmer.owner)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> DebuffPair<'info> {
    pub fn unlock_buff(&self) -> Result<()> {
        let ctx = CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                to: self.buff_user_ata.to_account_info(),
                from: self.buff_vault.to_account_info(),
                authority: self.farmer.to_account_info(),
            },
        );

        anchor_spl::token::transfer(ctx.with_signer(&[&self.farmer.seeds()]), 1)
    }
}

pub fn handler(ctx: Context<DebuffPair>) -> Result<()> {
    let mint_a_decrement = ctx.accounts.mint_a_receipt.try_debuff()?;
    let mint_b_decrement = ctx.accounts.mint_b_receipt.try_debuff()?;

    ctx.accounts.unlock_buff()?;

    let decrement = mint_a_decrement
        .checked_add(mint_b_decrement)
        .ok_or(StakingError::ArithmeticError)?;

    let farm = &mut ctx.accounts.farm;
    ctx.accounts.farmer.update_accrued_rewards(farm)?;
    ctx.accounts.farmer.decrease_reward_rate(decrement)?;

    Ok(())
}
