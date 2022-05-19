use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct RemoveFromWhitelist<'info> {
    pub farm: Account<'info, Farm>,

    #[account(
        has_one = authority,
        seeds = [
            FarmManager::PREFIX,
            farm.key().as_ref(),
            authority.key().as_ref(),
        ],
        bump,
    )]
    pub farm_manager: Account<'info, FarmManager>,

    #[account(mut, close = authority, has_one = farm)]
    pub whitelist_proof: Account<'info, WhitelistProof>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RemoveFromWhitelist>) -> Result<()> {
    msg!(
        "Removed {} from whitelist!",
        ctx.accounts.whitelist_proof.whitelisted_address
    );
    Ok(())
}
