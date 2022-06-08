use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct AddManager<'info> {
    pub farm: Account<'info, Farm>,

    #[account(
        init,
        payer = authority,
        space = 8 + FarmManager::LEN,
        seeds = [
            FarmManager::PREFIX,
            farm.key().as_ref(),
            authority.key().as_ref(),
        ],
        bump,
    )]
    pub farm_manager: Account<'info, FarmManager>,

    pub manager_authority: SystemAccount<'info>,

    #[account(mut, address = farm.authority)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddManager>) -> Result<()> {
    *ctx.accounts.farm_manager = FarmManager {
        farm: ctx.accounts.farm.key(),
        authority: ctx.accounts.manager_authority.key(),
    };

    Ok(())
}
