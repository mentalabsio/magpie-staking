use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct InitializeFarmer<'info> {
    pub farm: Account<'info, Farm>,

    #[account(
        init,
        payer = owner,
        space = 8 + Farmer::LEN,
        seeds = [
            Farmer::PREFIX,
            farm.key().as_ref(),
            owner.key().as_ref(),
        ],
        bump
    )]
    pub farmer: Account<'info, Farmer>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeFarmer>) -> Result<()> {
    let bump = ctx.bumps.get("farmer").unwrap();

    *ctx.accounts.farmer = Farmer::new(ctx.accounts.farm.key(), ctx.accounts.owner.key(), *bump)?;

    Ok(())
}
