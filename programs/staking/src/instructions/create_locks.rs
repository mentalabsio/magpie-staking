use anchor_lang::{prelude::*, Discriminator};

use crate::{state::*, utils};

#[derive(Accounts)]
pub struct CreateLocks<'info> {
    pub farm: Account<'info, Farm>,

    #[account(has_one = farm, has_one = authority)]
    pub farm_manager: Account<'info, FarmManager>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    // Remaining accounts can be any number of locks
    // pub lock: Account<'info, Lock>
}

#[derive(Copy, Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct LockConfig {
    pub duration: u64,
    pub bonus_factor: u8,
    pub cooldown: u64,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateLocks<'info>>,
    lock_configs: Vec<LockConfig>,
) -> Result<()> {
    let mut remaining_accs = ctx.remaining_accounts.iter();
    let farm = ctx.accounts.farm.key();

    for LockConfig {
        duration,
        cooldown,
        bonus_factor,
    } in lock_configs
    {
        let lock = next_account_info(&mut remaining_accs)?;

        // Calculate bump.
        let (_, bump) = Pubkey::find_program_address(
            &[
                Lock::PREFIX,
                farm.as_ref(),
                &duration.to_le_bytes(),
                &cooldown.to_le_bytes(),
            ],
            ctx.program_id,
        );

        // Create new PDA with space.
        utils::initialize_pda(
            &[
                Lock::PREFIX,
                farm.as_ref(),
                &duration.to_le_bytes(),
                &cooldown.to_le_bytes(),
                &[bump],
            ],
            8 + Lock::LEN,
            ctx.program_id,
            lock.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        )?;

        let raw_data = &mut lock.data.borrow_mut();
        let lock = Lock {
            farm,
            duration,
            cooldown,
            bonus_factor,
        };

        // Write discriminator.
        raw_data[..8].copy_from_slice(&Lock::discriminator());

        // Write struct fields.
        raw_data[8..].copy_from_slice(&lock.try_to_vec()?);
    }

    Ok(())
}
