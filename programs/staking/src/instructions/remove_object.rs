use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{state::*, utils};

#[derive(Accounts)]
pub struct RemoveObject<'info> {
    pub farm: Account<'info, Farm>,

    #[account(
        mut,
        has_one = farm,
        has_one = owner,
        seeds = [
            Farmer::PREFIX,
            farm.key().as_ref(),
            owner.key().as_ref()
        ],
        bump,
    )]
    pub farmer: Account<'info, Farmer>,

    #[account(address = receipt.mint)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        has_one = farmer,
    )]
    pub receipt: Account<'info, StakeReceipt>,

    pub object: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = object,
        associated_token::authority = owner,
    )]
    pub user_object_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = object,
        associated_token::authority = farmer,
    )]
    pub object_vault: Box<Account<'info, TokenAccount>>,

    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> RemoveObject<'info> {
    pub fn unlock_object(&self) -> Result<()> {
        let cpi_ctx = utils::transfer_spl_ctx(
            self.object_vault.to_account_info(),
            self.user_object_ata.to_account_info(),
            self.farmer.to_account_info(),
            self.token_program.to_account_info(),
        );

        anchor_spl::token::transfer(cpi_ctx.with_signer(&[&self.farmer.seeds()]), 1)
    }
}

pub fn handler(ctx: Context<RemoveObject>) -> Result<()> {
    let farmer = &mut ctx.accounts.farmer;
    let obj_key = ctx.accounts.object.key();

    ctx.accounts.receipt.try_remove_object(farmer, obj_key)?;

    ctx.accounts.unlock_object()?;

    Ok(())
}
