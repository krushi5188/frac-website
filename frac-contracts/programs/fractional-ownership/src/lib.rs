use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

const MAX_ORDERS: usize = 100;
const VAULT_CREATION_FEE: u64 = 100 * 10u64.pow(9); // 100 $FRAC
const TRADING_FEE_BPS: u64 = 25; // 0.25%
const REDEMPTION_FEE: u64 = 50 * 10u64.pow(9); // 50 $FRAC

#[program]
pub mod fractional_ownership {
    use super::*;

    /// Create a new fractional asset vault
    pub fn create_vault(
        ctx: Context<CreateVault>,
        vault_id: u64,
        asset_type: AssetType,
        total_shares: u64,
        initial_valuation_usd: u64,
        metadata_uri: String,
    ) -> Result<()> {
        require!(total_shares > 1000, ErrorCode::InvalidShareAmount);
        require!(total_shares <= 1_000_000_000, ErrorCode::InvalidShareAmount);
        require!(initial_valuation_usd > 0, ErrorCode::InvalidValuation);
        require!(!metadata_uri.is_empty(), ErrorCode::InvalidMetadataUri);

        // Charge vault creation fee
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            VAULT_CREATION_FEE,
        )?;

        // Initialize vault
        let vault = &mut ctx.accounts.vault;
        vault.vault_id = vault_id;
        vault.vault_nft_mint = Pubkey::default(); // Will be set when NFT minted
        vault.underlying_asset = ctx.accounts.underlying_asset.key();
        vault.asset_type = asset_type;
        vault.total_shares = total_shares;
        vault.shares_outstanding = total_shares;
        vault.creator = ctx.accounts.creator.key();
        vault.creation_time = Clock::get()?.unix_timestamp;
        vault.valuation_usd = initial_valuation_usd;
        vault.status = VaultStatus::Active;
        vault.metadata_uri = metadata_uri.clone();

        // Initialize order book
        let order_book = &mut ctx.accounts.order_book;
        order_book.vault_id = vault_id;
        order_book.buy_orders = Vec::new();
        order_book.sell_orders = Vec::new();

        // Create initial share holder (creator owns 100%)
        let share_holder = &mut ctx.accounts.share_holder;
        share_holder.vault_id = vault_id;
        share_holder.owner = ctx.accounts.creator.key();
        share_holder.shares = total_shares;
        share_holder.last_updated = Clock::get()?.unix_timestamp;

        emit!(VaultCreated {
            vault_id,
            creator: ctx.accounts.creator.key(),
            asset_type,
            total_shares,
            valuation_usd: initial_valuation_usd,
        });

        Ok(())
    }

    /// List fractional shares for sale
    pub fn list_shares_for_sale(
        ctx: Context<ListSharesForSale>,
        shares: u64,
        price_per_share: u64,
    ) -> Result<()> {
        let share_holder = &mut ctx.accounts.share_holder;
        let order_book = &mut ctx.accounts.order_book;

        require!(shares > 0, ErrorCode::InvalidShareAmount);
        require!(price_per_share > 0, ErrorCode::InvalidPrice);
        require!(shares <= share_holder.shares, ErrorCode::InsufficientShares);
        require!(
            order_book.sell_orders.len() < MAX_ORDERS,
            ErrorCode::OrderBookFull
        );

        let order_id = Clock::get()?.unix_timestamp as u64;
        let order = Order {
            user: ctx.accounts.seller.key(),
            shares,
            price_per_share,
            timestamp: Clock::get()?.unix_timestamp,
            order_id,
        };

        order_book.sell_orders.push(order);
        share_holder.last_updated = Clock::get()?.unix_timestamp;

        emit!(SharesListed {
            vault_id: ctx.accounts.vault.vault_id,
            seller: ctx.accounts.seller.key(),
            shares,
            price_per_share,
            order_id,
        });

        Ok(())
    }

    /// Buy fractional shares with $FRAC
    pub fn buy_shares(
        ctx: Context<BuyShares>,
        order_id: u64,
        shares: u64,
    ) -> Result<()> {
        let order_book = &mut ctx.accounts.order_book;

        // Find the order
        let order_index = order_book
            .sell_orders
            .iter()
            .position(|o| o.order_id == order_id)
            .ok_or(ErrorCode::OrderNotFound)?;

        let order = &order_book.sell_orders[order_index];
        require!(shares <= order.shares, ErrorCode::InsufficientSharesInOrder);

        // Calculate cost and fee
        let cost = shares
            .checked_mul(order.price_per_share)
            .ok_or(ErrorCode::MathOverflow)?;
        let trading_fee = cost
            .checked_mul(TRADING_FEE_BPS)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::MathOverflow)?;

        // Transfer $FRAC from buyer to seller
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            cost,
        )?;

        // Transfer trading fee to rewards pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.rewards_pool.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            trading_fee,
        )?;

        // Update share holders
        let seller_shares = &mut ctx.accounts.seller_share_holder;
        seller_shares.shares = seller_shares
            .shares
            .checked_sub(shares)
            .ok_or(ErrorCode::MathOverflow)?;
        seller_shares.last_updated = Clock::get()?.unix_timestamp;

        let buyer_shares = &mut ctx.accounts.buyer_share_holder;
        buyer_shares.shares = buyer_shares
            .shares
            .checked_add(shares)
            .ok_or(ErrorCode::MathOverflow)?;
        buyer_shares.last_updated = Clock::get()?.unix_timestamp;

        // Update or remove order
        if shares == order.shares {
            order_book.sell_orders.remove(order_index);
        } else {
            order_book.sell_orders[order_index].shares = order
                .shares
                .checked_sub(shares)
                .ok_or(ErrorCode::MathOverflow)?;
        }

        emit!(SharesPurchased {
            vault_id: ctx.accounts.vault.vault_id,
            buyer: ctx.accounts.buyer.key(),
            seller: order.user,
            shares,
            price_per_share: order.price_per_share,
            total_cost: cost,
            fee: trading_fee,
        });

        Ok(())
    }

    /// Cancel a sell order
    pub fn cancel_sell_order(
        ctx: Context<CancelSellOrder>,
        order_id: u64,
    ) -> Result<()> {
        let order_book = &mut ctx.accounts.order_book;

        let order_index = order_book
            .sell_orders
            .iter()
            .position(|o| o.order_id == order_id && o.user == ctx.accounts.seller.key())
            .ok_or(ErrorCode::OrderNotFound)?;

        order_book.sell_orders.remove(order_index);

        emit!(OrderCancelled {
            vault_id: ctx.accounts.vault.vault_id,
            seller: ctx.accounts.seller.key(),
            order_id,
        });

        Ok(())
    }

    /// Redeem underlying asset with 100% shares
    pub fn redeem_asset(ctx: Context<RedeemAsset>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let share_holder = &ctx.accounts.share_holder;

        require!(
            vault.status == VaultStatus::Active,
            ErrorCode::VaultNotActive
        );
        require!(
            share_holder.shares == vault.total_shares,
            ErrorCode::InsufficientSharesForRedemption
        );

        // Charge redemption fee
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.redeemer_token_account.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.redeemer.to_account_info(),
                },
            ),
            REDEMPTION_FEE,
        )?;

        // Update vault status
        vault.status = VaultStatus::Redeemed;
        vault.shares_outstanding = 0;

        emit!(AssetRedeemed {
            vault_id: vault.vault_id,
            redeemer: ctx.accounts.redeemer.key(),
            total_shares: vault.total_shares,
        });

        Ok(())
    }

    /// Update asset valuation (oracle or admin only)
    pub fn update_valuation(
        ctx: Context<UpdateValuation>,
        new_valuation_usd: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let old_valuation = vault.valuation_usd;

        require!(new_valuation_usd > 0, ErrorCode::InvalidValuation);
        // Prevent unreasonable valuation changes (>1000x)
        require!(
            new_valuation_usd < old_valuation.checked_mul(1000).unwrap_or(u64::MAX),
            ErrorCode::ValuationTooHigh
        );

        vault.valuation_usd = new_valuation_usd;

        emit!(ValuationUpdated {
            vault_id: vault.vault_id,
            old_valuation,
            new_valuation: new_valuation_usd,
        });

        Ok(())
    }
}

// Account Structures

#[account]
pub struct AssetVault {
    pub vault_id: u64,
    pub vault_nft_mint: Pubkey,
    pub underlying_asset: Pubkey,
    pub asset_type: AssetType,
    pub total_shares: u64,
    pub shares_outstanding: u64,
    pub creator: Pubkey,
    pub creation_time: i64,
    pub valuation_usd: u64,
    pub status: VaultStatus,
    pub metadata_uri: String,
}

#[account]
pub struct ShareHolder {
    pub vault_id: u64,
    pub owner: Pubkey,
    pub shares: u64,
    pub last_updated: i64,
}

#[account]
pub struct OrderBook {
    pub vault_id: u64,
    pub buy_orders: Vec<Order>,
    pub sell_orders: Vec<Order>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Order {
    pub user: Pubkey,
    pub shares: u64,
    pub price_per_share: u64,
    pub timestamp: i64,
    pub order_id: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AssetType {
    NFT,
    RealEstate,
    Art,
    Commodity,
    IntellectualProperty,
    MetaverseLand,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VaultStatus {
    Active,
    Locked,
    Redeemed,
}

// Context Structures

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 32 + 1 + 8 + 8 + 32 + 8 + 8 + 1 + 256,
        seeds = [b"vault", vault_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, AssetVault>,

    #[account(
        init,
        payer = creator,
        space = 8 + 8 + (32 + 8 + 8 + 8 + 8) * MAX_ORDERS * 2,
        seeds = [b"order_book", vault_id.to_le_bytes().as_ref()],
        bump
    )]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 8 + 8,
        seeds = [b"share_holder", vault_id.to_le_bytes().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub share_holder: Account<'info, ShareHolder>,

    /// CHECK: The underlying asset (NFT or RWA metadata)
    pub underlying_asset: AccountInfo<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListSharesForSale<'info> {
    #[account(mut)]
    pub vault: Account<'info, AssetVault>,

    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        mut,
        seeds = [b"share_holder", vault.vault_id.to_le_bytes().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub share_holder: Account<'info, ShareHolder>,

    #[account(mut)]
    pub seller: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub vault: Account<'info, AssetVault>,

    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        mut,
        seeds = [b"share_holder", vault.vault_id.to_le_bytes().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub seller_share_holder: Account<'info, ShareHolder>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + 8 + 32 + 8 + 8,
        seeds = [b"share_holder", vault.vault_id.to_le_bytes().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub buyer_share_holder: Account<'info, ShareHolder>,

    /// CHECK: Seller from order
    pub seller: AccountInfo<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub rewards_pool: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelSellOrder<'info> {
    #[account(mut)]
    pub vault: Account<'info, AssetVault>,

    #[account(mut)]
    pub order_book: Account<'info, OrderBook>,

    #[account(mut)]
    pub seller: Signer<'info>,
}

#[derive(Accounts)]
pub struct RedeemAsset<'info> {
    #[account(mut)]
    pub vault: Account<'info, AssetVault>,

    #[account(
        mut,
        seeds = [b"share_holder", vault.vault_id.to_le_bytes().as_ref(), redeemer.key().as_ref()],
        bump
    )]
    pub share_holder: Account<'info, ShareHolder>,

    #[account(mut)]
    pub redeemer: Signer<'info>,

    #[account(mut)]
    pub redeemer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateValuation<'info> {
    #[account(mut)]
    pub vault: Account<'info, AssetVault>,

    /// CHECK: Oracle or admin authority
    pub authority: Signer<'info>,
}

// Events

#[event]
pub struct VaultCreated {
    pub vault_id: u64,
    pub creator: Pubkey,
    pub asset_type: AssetType,
    pub total_shares: u64,
    pub valuation_usd: u64,
}

#[event]
pub struct SharesListed {
    pub vault_id: u64,
    pub seller: Pubkey,
    pub shares: u64,
    pub price_per_share: u64,
    pub order_id: u64,
}

#[event]
pub struct SharesPurchased {
    pub vault_id: u64,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub shares: u64,
    pub price_per_share: u64,
    pub total_cost: u64,
    pub fee: u64,
}

#[event]
pub struct OrderCancelled {
    pub vault_id: u64,
    pub seller: Pubkey,
    pub order_id: u64,
}

#[event]
pub struct AssetRedeemed {
    pub vault_id: u64,
    pub redeemer: Pubkey,
    pub total_shares: u64,
}

#[event]
pub struct ValuationUpdated {
    pub vault_id: u64,
    pub old_valuation: u64,
    pub new_valuation: u64,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid share amount")]
    InvalidShareAmount,
    #[msg("Invalid valuation")]
    InvalidValuation,
    #[msg("Invalid metadata URI")]
    InvalidMetadataUri,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Insufficient shares")]
    InsufficientShares,
    #[msg("Order book is full")]
    OrderBookFull,
    #[msg("Order not found")]
    OrderNotFound,
    #[msg("Insufficient shares in order")]
    InsufficientSharesInOrder,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Vault not active")]
    VaultNotActive,
    #[msg("Insufficient shares for redemption")]
    InsufficientSharesForRedemption,
    #[msg("Valuation too high")]
    ValuationTooHigh,
}
