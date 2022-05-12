use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{state::*, utils};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub farm: Account<'info, Farm>,

    #[account(mut, has_one = farm)]
    pub farmer: Account<'info, Farmer>,

    #[account(address = farm.reward.mint)]
    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = farm,
    )]
    pub farm_reward_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = reward_mint,
        associated_token::authority = authority,
    )]
    pub farmer_reward_vault: Account<'info, TokenAccount>,

    #[account(mut, address = farmer.owner)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ClaimRewards<'info> {
    pub fn transfer_reward(&self, amount: u64) -> Result<()> {
        let cpi_ctx = utils::transfer_spl_ctx(
            self.farm_reward_vault.to_account_info(),
            self.farmer_reward_vault.to_account_info(),
            self.farm.to_account_info(),
            self.token_program.to_account_info(),
        );

        anchor_spl::token::transfer(cpi_ctx.with_signer(&[&self.farm.seeds()]), amount)
    }
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let reward = ctx.accounts.farmer.claim_accrued(&mut ctx.accounts.farm)?;

    ctx.accounts.transfer_reward(reward)?;

    msg!("Claimed {} tokens", reward);

    Ok(())
}
