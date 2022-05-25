use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use solutils::wrappers::metadata::{MetadataAccount, TokenMetadata};

use crate::utils::metadata_creator;

#[derive(Debug, Copy, Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum WhitelistType {
    // An entire collection.
    Creator,
    // A fungible token address.
    Mint,
    // A NFT that will be used to buff the staking accounts.
    Buff,
}

#[account]
pub struct WhitelistProof {
    pub whitelisted_address: Pubkey,
    pub farm: Pubkey,
    // Tokens/gem/sec
    // If the type is "Buff" then this is a multiplier
    pub reward_rate: u64,
    pub ty: WhitelistType,
}

impl WhitelistProof {
    pub const LEN: usize = 32 + 32 + 8 + 1;
    pub const PREFIX: &'static [u8] = b"collection_data";

    pub fn validate<'info>(
        proof: &Account<Self>,
        mint: &Account<'info, Mint>,
        program_id: &Pubkey,
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<()> {
        use WhitelistType::*;
        let creator_or_mint_key = match proof.ty {
            Mint => mint.key(),
            Buff | Creator => {
                // If we need to check the creator, then we look at the remaining accounts so we
                // can access this mint's metadata account.
                let raw_account = remaining_accounts.first();
                let metadata = raw_account // Option<T>
                    .ok_or_else(|| {
                        msg!("Metadata account for mint {} was not given.", mint.key());
                        ProgramError::InvalidAccountData
                    })
                    .map(|acc| validate_metadata_account(acc, &mint.to_account_info()))??;

                metadata_creator(&metadata)?
            }
        };

        // Check whitelist_proof PDA
        let (pk, _bump) = Pubkey::find_program_address(
            &[
                WhitelistProof::PREFIX,
                proof.farm.key().as_ref(),
                creator_or_mint_key.as_ref(),
            ],
            program_id,
        );

        require_keys_eq!(proof.key(), pk);

        Ok(())
    }
}

pub fn validate_metadata_account<'info>(
    metadata: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
) -> Result<MetadataAccount> {
    // Check PDA
    let (pk, _) = Pubkey::find_program_address(
        &[
            b"metadata",
            TokenMetadata::id().as_ref(),
            mint.key().as_ref(),
        ],
        &TokenMetadata::id(),
    );

    require_keys_eq!(metadata.key(), pk);

    MetadataAccount::try_deserialize(&mut metadata.try_borrow_mut_data()?.as_ref())
}
