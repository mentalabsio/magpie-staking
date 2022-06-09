use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solutils::wrappers::metadata::MetadataAccount;

use crate::{error::*, state::*, utils};

#[derive(Accounts)]
pub struct AddObject<'info> {
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

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        has_one = farmer,
        has_one = mint,
        constraint = receipt.is_running() @ StakingError::GemNotStaked
    )]
    pub receipt: Account<'info, StakeReceipt>,

    pub object: Account<'info, Mint>,

    #[account(
        has_one = farm,
        constraint =
            object_whitelist.whitelisted_address == utils::metadata_creator(&object_metadata)?
            @ StakingError::AddressNotWhitelisted,
        constraint =
            object_whitelist.ty == WhitelistType::AssociatedObject
            @ StakingError::InvalidWhitelistType,
    )]
    pub object_whitelist: Account<'info, WhitelistProof>,

    #[account(
        constraint =
            object_metadata.mint == object.key()
            @ ProgramError::InvalidAccountData
    )]
    pub object_metadata: Box<Account<'info, MetadataAccount>>,

    #[account(
        mut,
        associated_token::mint = object,
        associated_token::authority = owner,
    )]
    pub user_object_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = object,
        associated_token::authority = farmer,
    )]
    pub object_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> AddObject<'info> {
    pub fn lock_object(&self) -> Result<()> {
        let cpi_ctx = utils::transfer_spl_ctx(
            self.user_object_ata.to_account_info(),
            self.object_vault.to_account_info(),
            self.owner.to_account_info(),
            self.token_program.to_account_info(),
        );

        anchor_spl::token::transfer(cpi_ctx, 1)
    }
}

pub fn handler(ctx: Context<AddObject>) -> Result<()> {
    ctx.accounts.lock_object()?;

    let farm = &mut ctx.accounts.farm;
    let farmer = &mut ctx.accounts.farmer;
    let obj_key = ctx.accounts.object.key();
    let obj_rate = ctx.accounts.object_whitelist.reward_rate;

    let object = AssociatedObject {
        key: obj_key,
        rate: obj_rate,
    };

    ctx.accounts.receipt.try_add_object(farm, farmer, object)?;

    Ok(())
}
