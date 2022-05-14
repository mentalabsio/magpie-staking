use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

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
            creator_or_mint.key().as_ref(),
        ],
        bump,
    )]
    pub whitelist_proof: Account<'info, WhitelistProof>,

    /// CHECK: Collection creator or mint address.
    pub creator_or_mint: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddToWhitelist>,
    reward_rate: u64,
    whitelist_type: WhitelistType,
) -> Result<()> {
    if let WhitelistType::Mint = whitelist_type {
        let data = ctx.accounts.creator_or_mint.try_borrow_mut_data()?;
        Mint::try_deserialize(&mut &**data)?;
    }

    *ctx.accounts.whitelist_proof = WhitelistProof {
        reward_rate,
        ty: whitelist_type,
        farm: ctx.accounts.farm.key(),
        whitelisted_address: ctx.accounts.creator_or_mint.key(),
    };

    Ok(())
}
