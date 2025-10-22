use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

const MIN_COLLATERAL: u64 = 100_000 * 10u64.pow(9); // 100k $FRAC
const WITHDRAWAL_DELAY: i64 = 604_800; // 7 days

#[program]
pub mod enterprise {
    use super::*;

    /// Initialize enterprise program
    pub fn initialize_enterprise(ctx: Context<InitializeEnterprise>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.governance_program.key();
        config.total_collateral_locked = 0;
        config.active_enterprises = 0;
        config.tier_thresholds = [
            100_000 * 10u64.pow(9),   // Tier 1: Starter
            500_000 * 10u64.pow(9),   // Tier 2: Business
            1_000_000 * 10u64.pow(9), // Tier 3: Enterprise
            5_000_000 * 10u64.pow(9), // Tier 4: Institutional
        ];
        config.duration_multipliers = [
            100, // 0 months: 1.0x
            130, // 6 months: 1.3x
            160, // 12 months: 1.6x
            200, // 24 months: 2.0x
        ];

        emit!(EnterpriseInitialized {
            authority: config.authority,
        });

        Ok(())
    }

    /// Register new enterprise and deposit collateral
    pub fn register_enterprise(
        ctx: Context<RegisterEnterprise>,
        enterprise_id: u64,
        company_name: String,
        collateral_amount: u64,
        lock_duration_days: u16,
    ) -> Result<()> {
        require!(
            collateral_amount >= MIN_COLLATERAL,
            ErrorCode::InsufficientCollateral
        );
        require!(!company_name.is_empty(), ErrorCode::EmptyCompanyName);
        require!(company_name.len() <= 64, ErrorCode::CompanyNameTooLong);
        require!(
            lock_duration_days == 0
                || lock_duration_days == 180
                || lock_duration_days == 365
                || lock_duration_days == 730,
            ErrorCode::InvalidLockDuration
        );

        let config = &mut ctx.accounts.config;
        let enterprise = &mut ctx.accounts.enterprise_account;
        let clock = Clock::get()?;

        // Transfer collateral from owner to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner_token_account.to_account_info(),
                    to: ctx.accounts.collateral_vault.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            collateral_amount,
        )?;

        // Determine tier
        let tier = determine_tier(&config.tier_thresholds, collateral_amount);

        // Determine duration multiplier
        let duration_multiplier = match lock_duration_days {
            0 => config.duration_multipliers[0],
            180 => config.duration_multipliers[1],
            365 => config.duration_multipliers[2],
            730 => config.duration_multipliers[3],
            _ => return Err(ErrorCode::InvalidLockDuration.into()),
        };

        // Calculate lock end time
        let lock_end_time = if lock_duration_days > 0 {
            clock
                .unix_timestamp
                .checked_add((lock_duration_days as i64) * 86400)
                .ok_or(ErrorCode::MathOverflow)?
        } else {
            0
        };

        // Calculate benefits
        let (featured_slots, featured_days, reward_multiplier) =
            calculate_benefits(tier, duration_multiplier);

        // Initialize enterprise account
        enterprise.enterprise_id = enterprise_id;
        enterprise.owner = ctx.accounts.owner.key();
        enterprise.company_name = company_name.clone();
        enterprise.collateral_amount = collateral_amount;
        enterprise.lock_duration_days = lock_duration_days;
        enterprise.lock_start_time = clock.unix_timestamp;
        enterprise.lock_end_time = lock_end_time;
        enterprise.tier = tier;
        enterprise.duration_multiplier = duration_multiplier;
        enterprise.featured_vault_slots = featured_slots;
        enterprise.featured_vault_days = featured_days;
        enterprise.reward_multiplier = reward_multiplier;
        enterprise.created_at = clock.unix_timestamp;
        enterprise.status = EnterpriseStatus::Active;

        // Update config
        config.total_collateral_locked = config
            .total_collateral_locked
            .checked_add(collateral_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        config.active_enterprises = config
            .active_enterprises
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(EnterpriseRegistered {
            enterprise_id,
            owner: ctx.accounts.owner.key(),
            company_name,
            collateral_amount,
            tier,
            lock_duration_days,
        });

        Ok(())
    }

    /// Add more collateral (may upgrade tier)
    pub fn add_collateral(
        ctx: Context<AddCollateral>,
        additional_amount: u64,
    ) -> Result<()> {
        let enterprise = &mut ctx.accounts.enterprise_account;
        let config = &mut ctx.accounts.config;

        require!(
            enterprise.status == EnterpriseStatus::Active,
            ErrorCode::EnterpriseNotActive
        );
        require!(additional_amount > 0, ErrorCode::InvalidAmount);

        // Transfer additional collateral
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner_token_account.to_account_info(),
                    to: ctx.accounts.collateral_vault.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            additional_amount,
        )?;

        // Update enterprise
        enterprise.collateral_amount = enterprise
            .collateral_amount
            .checked_add(additional_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        // Recalculate tier (may upgrade)
        let new_tier = determine_tier(&config.tier_thresholds, enterprise.collateral_amount);
        enterprise.tier = new_tier;

        // Recalculate benefits
        let (featured_slots, featured_days, reward_multiplier) =
            calculate_benefits(new_tier, enterprise.duration_multiplier);
        enterprise.featured_vault_slots = featured_slots;
        enterprise.featured_vault_days = featured_days;
        enterprise.reward_multiplier = reward_multiplier;

        // Update config
        config.total_collateral_locked = config
            .total_collateral_locked
            .checked_add(additional_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(CollateralAdded {
            enterprise_id: enterprise.enterprise_id,
            additional_amount,
            new_total: enterprise.collateral_amount,
            new_tier,
        });

        Ok(())
    }

    /// Initiate withdrawal (starts 7-day delay for flexible)
    pub fn initiate_withdrawal(ctx: Context<InitiateWithdrawal>) -> Result<()> {
        let enterprise = &mut ctx.accounts.enterprise_account;
        let clock = Clock::get()?;

        require!(
            enterprise.status == EnterpriseStatus::Active,
            ErrorCode::EnterpriseNotActive
        );

        // Check if lock period has ended (for fixed-term)
        if enterprise.lock_duration_days > 0 {
            require!(
                clock.unix_timestamp >= enterprise.lock_end_time,
                ErrorCode::LockPeriodNotEnded
            );
        }

        enterprise.status = EnterpriseStatus::Unlocking;
        // Set withdrawal available time (7 days from now)
        enterprise.lock_end_time = clock
            .unix_timestamp
            .checked_add(WITHDRAWAL_DELAY)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(WithdrawalInitiated {
            enterprise_id: enterprise.enterprise_id,
            withdrawal_available_at: enterprise.lock_end_time,
        });

        Ok(())
    }

    /// Complete withdrawal (after delay)
    pub fn complete_withdrawal(ctx: Context<CompleteWithdrawal>) -> Result<()> {
        let enterprise = &mut ctx.accounts.enterprise_account;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(
            enterprise.status == EnterpriseStatus::Unlocking,
            ErrorCode::NotUnlocking
        );
        require!(
            clock.unix_timestamp >= enterprise.lock_end_time,
            ErrorCode::WithdrawalDelayNotEnded
        );

        let amount = enterprise.collateral_amount;

        // Transfer collateral back to owner
        let seeds = &[b"collateral_vault".as_ref(), &[ctx.bumps.collateral_vault]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.collateral_vault.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.collateral_vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Update enterprise
        enterprise.collateral_amount = 0;
        enterprise.status = EnterpriseStatus::Withdrawn;

        // Update config
        config.total_collateral_locked = config
            .total_collateral_locked
            .checked_sub(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        config.active_enterprises = config
            .active_enterprises
            .checked_sub(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(WithdrawalCompleted {
            enterprise_id: enterprise.enterprise_id,
            amount,
        });

        Ok(())
    }

    /// Get enterprise discount (public query for other programs)
    pub fn get_enterprise_discount(
        ctx: Context<GetEnterpriseDiscount>,
    ) -> Result<(bool, u16, u16, u16)> {
        let enterprise = &ctx.accounts.enterprise_account;

        if enterprise.status != EnterpriseStatus::Active {
            return Ok((false, 0, 0, 0));
        }

        // Calculate vault creation discount (basis points)
        let vault_discount_bps = match enterprise.tier {
            1 => 2500,  // 25%
            2 => 5000,  // 50%
            3 => 7500,  // 75%
            4 => 10000, // 100%
            _ => 0,
        };

        // Apply duration multiplier
        let adjusted_discount = vault_discount_bps
            .checked_mul(enterprise.duration_multiplier)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)?;

        // Calculate trading fee rate (basis points)
        let trading_fee_bps = match enterprise.tier {
            1 => 20,  // 0.20%
            2 => 15,  // 0.15%
            3 => 10,  // 0.10%
            4 => 5,   // 0.05%
            _ => 25,  // 0.25% (default)
        };

        Ok((
            true,
            adjusted_discount.min(10000), // Cap at 100%
            trading_fee_bps,
            enterprise.reward_multiplier,
        ))
    }

    /// Update tier thresholds (governance only)
    pub fn update_tier_thresholds(
        ctx: Context<UpdateTierThresholds>,
        new_thresholds: [u64; 4],
    ) -> Result<()> {
        // Verify ascending order
        for i in 0..3 {
            require!(
                new_thresholds[i] < new_thresholds[i + 1],
                ErrorCode::InvalidThresholds
            );
        }

        let config = &mut ctx.accounts.config;
        config.tier_thresholds = new_thresholds;

        emit!(TierThresholdsUpdated { new_thresholds });

        Ok(())
    }
}

// Helper Functions

fn determine_tier(thresholds: &[u64; 4], amount: u64) -> u8 {
    if amount >= thresholds[3] {
        4 // Institutional
    } else if amount >= thresholds[2] {
        3 // Enterprise
    } else if amount >= thresholds[1] {
        2 // Business
    } else if amount >= thresholds[0] {
        1 // Starter
    } else {
        0 // None
    }
}

fn calculate_benefits(tier: u8, duration_multiplier: u16) -> (u8, u16, u16) {
    let base_featured_slots = match tier {
        1 => 1,
        2 => 3,
        3 => 10,
        4 => 255, // Unlimited
        _ => 0,
    };

    let base_featured_days = match tier {
        1 => 7,
        2 => 30,
        3 => 90,
        4 => 36500, // ~100 years (permanent)
        _ => 0,
    };

    let base_reward_multiplier = match tier {
        1 => 110,  // 1.1x
        2 => 125,  // 1.25x
        3 => 150,  // 1.5x
        4 => 200,  // 2.0x
        _ => 100,  // 1.0x
    };

    // Apply duration multiplier to reward multiplier
    let final_reward_multiplier = (base_reward_multiplier as u32)
        .checked_mul(duration_multiplier as u32)
        .unwrap_or(u32::MAX)
        .checked_div(100)
        .unwrap_or(u16::MAX as u32)
        .min(400) as u16; // Cap at 4.0x

    (
        base_featured_slots,
        base_featured_days,
        final_reward_multiplier,
    )
}

// Account Structures

#[account]
pub struct EnterpriseConfig {
    pub authority: Pubkey,
    pub total_collateral_locked: u64,
    pub active_enterprises: u32,
    pub tier_thresholds: [u64; 4],
    pub duration_multipliers: [u16; 4],
}

#[account]
pub struct EnterpriseAccount {
    pub enterprise_id: u64,
    pub owner: Pubkey,
    pub company_name: String,
    pub collateral_amount: u64,
    pub lock_duration_days: u16,
    pub lock_start_time: i64,
    pub lock_end_time: i64,
    pub tier: u8,
    pub duration_multiplier: u16,
    pub featured_vault_slots: u8,
    pub featured_vault_days: u16,
    pub reward_multiplier: u16,
    pub created_at: i64,
    pub status: EnterpriseStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum EnterpriseStatus {
    Active,
    Unlocking,
    Withdrawn,
}

// Context Structures

#[derive(Accounts)]
pub struct InitializeEnterprise<'info> {
    #[account(
        init,
        payer = deployer,
        space = 8 + 32 + 8 + 4 + 32 + 8,
        seeds = [b"enterprise_config"],
        bump
    )]
    pub config: Account<'info, EnterpriseConfig>,

    /// CHECK: Governance program
    pub governance_program: AccountInfo<'info>,

    #[account(mut)]
    pub deployer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(enterprise_id: u64)]
pub struct RegisterEnterprise<'info> {
    #[account(mut, seeds = [b"enterprise_config"], bump)]
    pub config: Account<'info, EnterpriseConfig>,

    #[account(
        init,
        payer = owner,
        space = 8 + 8 + 32 + 64 + 8 + 2 + 8 + 8 + 1 + 2 + 1 + 2 + 2 + 8 + 1,
        seeds = [b"enterprise", enterprise_id.to_le_bytes().as_ref()],
        bump
    )]
    pub enterprise_account: Account<'info, EnterpriseAccount>,

    #[account(
        mut,
        seeds = [b"collateral_vault"],
        bump
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCollateral<'info> {
    #[account(mut, seeds = [b"enterprise_config"], bump)]
    pub config: Account<'info, EnterpriseConfig>,

    #[account(
        mut,
        has_one = owner,
    )]
    pub enterprise_account: Account<'info, EnterpriseAccount>,

    #[account(
        mut,
        seeds = [b"collateral_vault"],
        bump
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitiateWithdrawal<'info> {
    #[account(
        mut,
        has_one = owner,
    )]
    pub enterprise_account: Account<'info, EnterpriseAccount>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteWithdrawal<'info> {
    #[account(mut, seeds = [b"enterprise_config"], bump)]
    pub config: Account<'info, EnterpriseConfig>,

    #[account(
        mut,
        has_one = owner,
    )]
    pub enterprise_account: Account<'info, EnterpriseAccount>,

    #[account(
        mut,
        seeds = [b"collateral_vault"],
        bump
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetEnterpriseDiscount<'info> {
    pub enterprise_account: Account<'info, EnterpriseAccount>,
}

#[derive(Accounts)]
pub struct UpdateTierThresholds<'info> {
    #[account(
        mut,
        seeds = [b"enterprise_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, EnterpriseConfig>,

    pub authority: Signer<'info>,
}

// Events

#[event]
pub struct EnterpriseInitialized {
    pub authority: Pubkey,
}

#[event]
pub struct EnterpriseRegistered {
    pub enterprise_id: u64,
    pub owner: Pubkey,
    pub company_name: String,
    pub collateral_amount: u64,
    pub tier: u8,
    pub lock_duration_days: u16,
}

#[event]
pub struct CollateralAdded {
    pub enterprise_id: u64,
    pub additional_amount: u64,
    pub new_total: u64,
    pub new_tier: u8,
}

#[event]
pub struct WithdrawalInitiated {
    pub enterprise_id: u64,
    pub withdrawal_available_at: i64,
}

#[event]
pub struct WithdrawalCompleted {
    pub enterprise_id: u64,
    pub amount: u64,
}

#[event]
pub struct TierThresholdsUpdated {
    pub new_thresholds: [u64; 4],
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Empty company name")]
    EmptyCompanyName,
    #[msg("Company name too long")]
    CompanyNameTooLong,
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Enterprise not active")]
    EnterpriseNotActive,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Lock period not ended")]
    LockPeriodNotEnded,
    #[msg("Not unlocking")]
    NotUnlocking,
    #[msg("Withdrawal delay not ended")]
    WithdrawalDelayNotEnded,
    #[msg("Invalid thresholds")]
    InvalidThresholds,
}
