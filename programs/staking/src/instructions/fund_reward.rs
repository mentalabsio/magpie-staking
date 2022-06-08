use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{state::*, utils};

#[derive(Accounts)]
pub struct FundReward<'info> {
    #[account(mut)]
    pub farm: Account<'info, Farm>,

    #[account(has_one = authority, has_one = farm)]
    pub farm_manager: Account<'info, FarmManager>,

    #[account(address = farm.reward.mint)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = farm,
    )]
    pub farm_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub manager_ata: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FundReward>, amount: u64) -> Result<()> {
    let cpi_ctx = utils::transfer_spl_ctx(
        ctx.accounts.manager_ata.to_account_info(),
        ctx.accounts.farm_vault.to_account_info(),
        ctx.accounts.authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    );

    anchor_spl::token::transfer(cpi_ctx, amount)?;

    ctx.accounts.farm.reward.try_fund(amount)?;

    Ok(())
}
