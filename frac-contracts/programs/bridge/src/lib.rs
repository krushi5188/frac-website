use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

const MIN_BRIDGE_AMOUNT: u64 = 10 * 10u64.pow(9); // 10 $FRAC
const MAX_BRIDGE_AMOUNT: u64 = 1_000_000 * 10u64.pow(9); // 1M $FRAC
const BRIDGE_FEE: u64 = 1 * 10u64.pow(9); // 1 $FRAC

#[program]
pub mod bridge {
    use super::*;

    /// Initialize bridge program
    pub fn initialize_bridge(
        ctx: Context<InitializeBridge>,
        wormhole_program: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.governance_program.key();
        config.bridge_implementation = BridgeType::Wormhole;
        config.wormhole_program = wormhole_program;
        config.total_bridged_out = 0;
        config.total_bridged_in = 0;
        config.supported_chains = vec![
            ChainId::Solana,
            ChainId::Ethereum,
            ChainId::BSC,
        ];
        config.bridge_fee = BRIDGE_FEE;
        config.paused = false;

        emit!(BridgeInitialized {
            authority: config.authority,
            wormhole_program,
        });

        Ok(())
    }

    /// Bridge tokens out from Solana to another chain
    pub fn bridge_tokens_out(
        ctx: Context<BridgeTokensOut>,
        transfer_id: u64,
        amount: u64,
        destination_chain: ChainId,
        recipient_address: Vec<u8>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        require!(!config.paused, ErrorCode::BridgePaused);
        require!(
            amount >= MIN_BRIDGE_AMOUNT,
            ErrorCode::AmountBelowMinimum
        );
        require!(
            amount <= MAX_BRIDGE_AMOUNT,
            ErrorCode::AmountAboveMaximum
        );
        require!(
            config.supported_chains.contains(&destination_chain),
            ErrorCode::ChainNotSupported
        );
        require!(
            recipient_address.len() == 20 || recipient_address.len() == 32,
            ErrorCode::InvalidRecipientAddress
        );

        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        // Transfer tokens from user to bridge vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.bridge_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Transfer bridge fee to treasury
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            config.bridge_fee,
        )?;

        // Initialize transfer record
        transfer.transfer_id = transfer_id;
        transfer.user = ctx.accounts.user.key();
        transfer.source_chain = ChainId::Solana;
        transfer.destination_chain = destination_chain;
        transfer.amount = amount;
        transfer.recipient_address = recipient_address.clone();
        transfer.status = TransferStatus::Initiated;
        transfer.initiated_at = clock.unix_timestamp;
        transfer.completed_at = 0;
        transfer.wormhole_sequence = 0; // Set by Wormhole CPI

        // Update config
        config.total_bridged_out = config
            .total_bridged_out
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(TokensBridgedOut {
            transfer_id,
            user: ctx.accounts.user.key(),
            amount,
            destination_chain,
            recipient_address,
        });

        // In production: CPI to Wormhole to initiate cross-chain transfer
        // wormhole::cpi::transfer_tokens(...)

        Ok(())
    }

    /// Complete bridge transfer in from another chain to Solana
    pub fn complete_transfer_in(
        ctx: Context<CompleteTransferIn>,
        transfer_id: u64,
        amount: u64,
        vaa: Vec<u8>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let transfer = &mut ctx.accounts.transfer;
        let clock = Clock::get()?;

        require!(!config.paused, ErrorCode::BridgePaused);
        require!(!vaa.is_empty(), ErrorCode::InvalidVAA);

        // In production: Verify VAA with Wormhole
        // wormhole::cpi::verify_vaa(...)
        // Parse VAA to extract amount, recipient, etc.

        // Transfer tokens from bridge vault to recipient
        let seeds = &[b"bridge_vault".as_ref(), &[ctx.bumps.bridge_vault]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bridge_vault.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.bridge_vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Update or create transfer record
        transfer.transfer_id = transfer_id;
        transfer.user = ctx.accounts.recipient.key();
        transfer.source_chain = ChainId::Ethereum; // Parse from VAA
        transfer.destination_chain = ChainId::Solana;
        transfer.amount = amount;
        transfer.recipient_address = ctx.accounts.recipient.key().to_bytes().to_vec();
        transfer.status = TransferStatus::Completed;
        transfer.initiated_at = 0; // Unknown
        transfer.completed_at = clock.unix_timestamp;
        transfer.wormhole_sequence = 0; // Parse from VAA

        // Update config
        config.total_bridged_in = config
            .total_bridged_in
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(TokensBridgedIn {
            transfer_id,
            recipient: ctx.accounts.recipient.key(),
            amount,
            source_chain: transfer.source_chain,
        });

        Ok(())
    }

    /// Get bridge transfer status (public query)
    pub fn get_bridge_status(
        _ctx: Context<GetBridgeStatus>,
        transfer: &BridgeTransfer,
    ) -> Result<(TransferStatus, u64, ChainId, i64, i64)> {
        Ok((
            transfer.status.clone(),
            transfer.amount,
            transfer.destination_chain,
            transfer.initiated_at,
            transfer.completed_at,
        ))
    }

    /// Pause/unpause bridge (governance or emergency)
    pub fn pause_bridge(ctx: Context<PauseBridge>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.paused = paused;

        if paused {
            emit!(BridgePaused {});
        } else {
            emit!(BridgeUnpaused {});
        }

        Ok(())
    }

    /// Update bridge fee
    pub fn update_bridge_fee(ctx: Context<UpdateBridgeFee>, new_fee: u64) -> Result<()> {
        require!(new_fee <= 10 * 10u64.pow(9), ErrorCode::FeeTooHigh);

        let config = &mut ctx.accounts.config;
        config.bridge_fee = new_fee;

        emit!(BridgeFeeUpdated { new_fee });

        Ok(())
    }

    /// Add supported chain
    pub fn add_supported_chain(
        ctx: Context<AddSupportedChain>,
        chain_id: ChainId,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        require!(
            !config.supported_chains.contains(&chain_id),
            ErrorCode::ChainAlreadySupported
        );

        config.supported_chains.push(chain_id);

        emit!(ChainAdded { chain_id });

        Ok(())
    }

    /// Migrate to custom bridge (V2)
    pub fn migrate_to_custom_bridge(
        ctx: Context<MigrateToCustomBridge>,
        custom_bridge_program: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.bridge_implementation = BridgeType::Custom;
        config.wormhole_program = custom_bridge_program; // Reuse field

        emit!(BridgeMigrated {
            new_implementation: BridgeType::Custom,
            new_program: custom_bridge_program,
        });

        Ok(())
    }
}

// Account Structures

#[account]
pub struct BridgeConfig {
    pub authority: Pubkey,
    pub bridge_implementation: BridgeType,
    pub wormhole_program: Pubkey,
    pub total_bridged_out: u64,
    pub total_bridged_in: u64,
    pub supported_chains: Vec<ChainId>,
    pub bridge_fee: u64,
    pub paused: bool,
}

#[account]
pub struct BridgeTransfer {
    pub transfer_id: u64,
    pub user: Pubkey,
    pub source_chain: ChainId,
    pub destination_chain: ChainId,
    pub amount: u64,
    pub recipient_address: Vec<u8>,
    pub status: TransferStatus,
    pub initiated_at: i64,
    pub completed_at: i64,
    pub wormhole_sequence: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BridgeType {
    Wormhole,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ChainId {
    Solana,
    Ethereum,
    BSC,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TransferStatus {
    Initiated,
    Attested,
    Completed,
    Failed,
}

// Context Structures

#[derive(Accounts)]
pub struct InitializeBridge<'info> {
    #[account(
        init,
        payer = deployer,
        space = 8 + 32 + 1 + 32 + 8 + 8 + 256 + 8 + 1,
        seeds = [b"bridge_config"],
        bump
    )]
    pub config: Account<'info, BridgeConfig>,

    /// CHECK: Governance program
    pub governance_program: AccountInfo<'info>,

    #[account(mut)]
    pub deployer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(transfer_id: u64)]
pub struct BridgeTokensOut<'info> {
    #[account(mut, seeds = [b"bridge_config"], bump)]
    pub config: Account<'info, BridgeConfig>,

    #[account(
        init,
        payer = user,
        space = 8 + 8 + 32 + 1 + 1 + 8 + 64 + 1 + 8 + 8 + 8,
        seeds = [b"bridge_transfer", transfer_id.to_le_bytes().as_ref()],
        bump
    )]
    pub transfer: Account<'info, BridgeTransfer>,

    #[account(
        mut,
        seeds = [b"bridge_vault"],
        bump
    )]
    pub bridge_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(transfer_id: u64)]
pub struct CompleteTransferIn<'info> {
    #[account(mut, seeds = [b"bridge_config"], bump)]
    pub config: Account<'info, BridgeConfig>,

    #[account(
        init_if_needed,
        payer = recipient,
        space = 8 + 8 + 32 + 1 + 1 + 8 + 64 + 1 + 8 + 8 + 8,
        seeds = [b"bridge_transfer", transfer_id.to_le_bytes().as_ref()],
        bump
    )]
    pub transfer: Account<'info, BridgeTransfer>,

    #[account(
        mut,
        seeds = [b"bridge_vault"],
        bump
    )]
    pub bridge_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient: Signer<'info>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetBridgeStatus<'info> {
    pub transfer: Account<'info, BridgeTransfer>,
}

#[derive(Accounts)]
pub struct PauseBridge<'info> {
    #[account(
        mut,
        seeds = [b"bridge_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, BridgeConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateBridgeFee<'info> {
    #[account(
        mut,
        seeds = [b"bridge_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, BridgeConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddSupportedChain<'info> {
    #[account(
        mut,
        seeds = [b"bridge_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, BridgeConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MigrateToCustomBridge<'info> {
    #[account(
        mut,
        seeds = [b"bridge_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, BridgeConfig>,

    pub authority: Signer<'info>,
}

// Events

#[event]
pub struct BridgeInitialized {
    pub authority: Pubkey,
    pub wormhole_program: Pubkey,
}

#[event]
pub struct TokensBridgedOut {
    pub transfer_id: u64,
    pub user: Pubkey,
    pub amount: u64,
    pub destination_chain: ChainId,
    pub recipient_address: Vec<u8>,
}

#[event]
pub struct TokensBridgedIn {
    pub transfer_id: u64,
    pub recipient: Pubkey,
    pub amount: u64,
    pub source_chain: ChainId,
}

#[event]
pub struct BridgePaused {}

#[event]
pub struct BridgeUnpaused {}

#[event]
pub struct BridgeFeeUpdated {
    pub new_fee: u64,
}

#[event]
pub struct ChainAdded {
    pub chain_id: ChainId,
}

#[event]
pub struct BridgeMigrated {
    pub new_implementation: BridgeType,
    pub new_program: Pubkey,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Bridge is paused")]
    BridgePaused,
    #[msg("Amount below minimum")]
    AmountBelowMinimum,
    #[msg("Amount above maximum")]
    AmountAboveMaximum,
    #[msg("Chain not supported")]
    ChainNotSupported,
    #[msg("Invalid recipient address")]
    InvalidRecipientAddress,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid VAA")]
    InvalidVAA,
    #[msg("Fee too high")]
    FeeTooHigh,
    #[msg("Chain already supported")]
    ChainAlreadySupported,
}
