use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::*};

use crate::state::*;

#[derive(Accounts)]
pub struct CreateFarm<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Farm::LEN,
        seeds = [Farm::PREFIX, authority.key().as_ref(), reward_mint.key().as_ref()],
        bump
    )]
    pub farm: Account<'info, Farm>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = reward_mint,
        associated_token::authority = farm,
    )]
    pub farm_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<CreateFarm>) -> Result<()> {
    let reward = Reward::new(ctx.accounts.reward_mint.key());

    *ctx.accounts.farm = Farm {
        reward,
        authority: ctx.accounts.authority.key(),
        bump: [*ctx.bumps.get("farm").unwrap()],
    };

    msg!("Initialized new farm at {}", ctx.accounts.farm.key());

    Ok(())
}
