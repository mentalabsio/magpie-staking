use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct AddToWhitelist<'info> {
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

    #[account(
        init,
        space = 8 + WhitelistProof::LEN,
        payer = authority,
        seeds = [
            WhitelistProof::PREFIX,
            farm.key().as_ref(),
            creator.key().as_ref(),
        ],
        bump,
    )]
    pub whitelist_proof: Account<'info, WhitelistProof>,

    /// CHECK: Collection creator address.
    pub creator: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddToWhitelist>,
    // tokens/sec
    reward_rate: u64,
) -> Result<()> {
    *ctx.accounts.whitelist_proof = WhitelistProof {
        reward_rate,
        farm: ctx.accounts.farm.key(),
        creator: ctx.accounts.creator.key(),
    };

    Ok(())
}
