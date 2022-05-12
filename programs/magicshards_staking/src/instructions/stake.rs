use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solutils::wrappers::metadata::{MetadataAccount, TokenMetadata};

use crate::{error::*, state::*, utils::*};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
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

    #[account(
        constraint = metadata_creator(&*gem_metadata)?.eq(&whitelist_proof.creator),
        seeds = [
            WhitelistProof::PREFIX,
            farm.key().as_ref(),
            metadata_creator(&*gem_metadata)?.as_ref(),
        ],
        bump,
    )]
    pub whitelist_proof: Account<'info, WhitelistProof>,

    pub gem_mint: Account<'info, Mint>,

    #[account(
        seeds = [
          b"metadata".as_ref(),
          TokenMetadata::id().as_ref(),
          gem_mint.key().as_ref(),
        ],
        seeds::program = TokenMetadata::id(),
        bump,
    )]
    pub gem_metadata: Box<Account<'info, MetadataAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = gem_mint,
        associated_token::authority = farmer,
    )]
    pub farmer_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = gem_mint,
        associated_token::authority = owner,
    )]
    pub gem_owner_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + StakeReceipt::LEN,
        seeds = [
            StakeReceipt::PREFIX,
            farmer.key().as_ref(),
            gem_mint.key().as_ref(),
        ],
        bump,
    )]
    pub stake_receipt: Account<'info, StakeReceipt>,

    #[account(has_one = farm)]
    pub lock: Account<'info, Lock>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl Stake<'_> {
    pub fn lock_gem(&self, amount: u64) -> Result<()> {
        let cpi_ctx = transfer_spl_ctx(
            self.gem_owner_ata.to_account_info(),
            self.farmer_vault.to_account_info(),
            self.owner.to_account_info(),
            self.token_program.to_account_info(),
        );

        anchor_spl::token::transfer(cpi_ctx, amount)
    }
}

pub fn handler(ctx: Context<Stake>, amount: u64) -> Result<()> {
    // Lock the nft to the farmer account.
    ctx.accounts.lock_gem(amount)?;

    let stake_receipt = &mut ctx.accounts.stake_receipt;
    let now_ts = now_ts()?;

    if stake_receipt.farmer != Pubkey::default() {
        // Trying to stake and NFT that's already been staked once before.
        require_keys_eq!(stake_receipt.farmer, ctx.accounts.farmer.key());
        require_keys_eq!(stake_receipt.mint, ctx.accounts.gem_mint.key());

        if let Some(end_ts) = stake_receipt.end_ts {
            // This NFT has already been unstaked.
            let cooldown = ctx.accounts.lock.cooldown;
            require_gte!(now_ts, end_ts + cooldown, StakingError::CooldownIsNotOver);

            // Here the cooldown is already over, so just update the receipt with the new
            // information.
            stake_receipt.end_ts = None;
            stake_receipt.start_ts = now_ts;
            stake_receipt.lock = ctx.accounts.lock.key();
        }
    } else {
        **stake_receipt = StakeReceipt {
            end_ts: None,
            start_ts: now_ts,
            lock: ctx.accounts.lock.key(),
            farmer: ctx.accounts.farmer.key(),
            mint: ctx.accounts.gem_mint.key(),
        };
    }

    let farm = &mut ctx.accounts.farm;
    let factor = ctx.accounts.lock.bonus_factor;
    let base_rate = amount * ctx.accounts.whitelist_proof.reward_rate;
    let reward_rate = calculate_reward_rate(base_rate, factor as u64)?;

    let reserved_amount = reward_rate as u64 * ctx.accounts.lock.duration;
    farm.reward.try_reserve(reserved_amount)?;

    ctx.accounts
        .farmer
        .increase_reward_rate(reward_rate as u64)?;

    Ok(())
}
