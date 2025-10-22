use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, SetAuthority};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod frac_token {
    use super::*;

    /// Initialize the $FRAC SPL token mint with 1B supply
    /// Distributes tokens to designated allocation accounts
    pub fn initialize_token(ctx: Context<InitializeToken>) -> Result<()> {
        let total_supply: u64 = 1_000_000_000 * 10u64.pow(9); // 1B tokens with 9 decimals

        // Mint full 1B supply to temporary holding account
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.deployer_token_account.to_account_info(),
            authority: ctx.accounts.deployer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, total_supply)?;

        // Distribution amounts (based on planning.md)
        let community_amount = 450_000_000 * 10u64.pow(9); // 45%
        let staking_rewards_amount = 250_000_000 * 10u64.pow(9); // 25%
        let team_amount = 150_000_000 * 10u64.pow(9); // 15%
        let treasury_amount = 100_000_000 * 10u64.pow(9); // 10%
        let liquidity_amount = 50_000_000 * 10u64.pow(9); // 5%

        // Transfer to community pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.deployer_token_account.to_account_info(),
                    to: ctx.accounts.community_pool.to_account_info(),
                    authority: ctx.accounts.deployer.to_account_info(),
                },
            ),
            community_amount,
        )?;

        // Transfer to staking rewards pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.deployer_token_account.to_account_info(),
                    to: ctx.accounts.staking_rewards_pool.to_account_info(),
                    authority: ctx.accounts.deployer.to_account_info(),
                },
            ),
            staking_rewards_amount,
        )?;

        // Transfer to team vesting
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.deployer_token_account.to_account_info(),
                    to: ctx.accounts.team_vesting_pool.to_account_info(),
                    authority: ctx.accounts.deployer.to_account_info(),
                },
            ),
            team_amount,
        )?;

        // Transfer to treasury
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.deployer_token_account.to_account_info(),
                    to: ctx.accounts.treasury_pool.to_account_info(),
                    authority: ctx.accounts.deployer.to_account_info(),
                },
            ),
            treasury_amount,
        )?;

        // Transfer to liquidity pool (remainder)
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.deployer_token_account.to_account_info(),
                    to: ctx.accounts.liquidity_pool.to_account_info(),
                    authority: ctx.accounts.deployer.to_account_info(),
                },
            ),
            liquidity_amount,
        )?;

        emit!(TokenInitialized {
            mint: ctx.accounts.mint.key(),
            total_supply,
            community_amount,
            staking_rewards_amount,
            team_amount,
            treasury_amount,
            liquidity_amount,
        });

        Ok(())
    }

    /// Transfer mint authority to governance program
    /// After this, no additional tokens can be minted
    pub fn transfer_mint_authority(
        ctx: Context<TransferMintAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let cpi_accounts = SetAuthority {
            current_authority: ctx.accounts.current_authority.to_account_info(),
            account_or_mint: ctx.accounts.mint.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::set_authority(
            cpi_ctx,
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            Some(new_authority),
        )?;

        emit!(MintAuthorityTransferred {
            mint: ctx.accounts.mint.key(),
            old_authority: ctx.accounts.current_authority.key(),
            new_authority,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeToken<'info> {
    #[account(
        init,
        payer = deployer,
        mint::decimals = 9,
        mint::authority = deployer,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub deployer: Signer<'info>,

    #[account(
        init,
        payer = deployer,
        associated_token::mint = mint,
        associated_token::authority = deployer,
    )]
    pub deployer_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = deployer,
        token::mint = mint,
        token::authority = community_authority,
    )]
    pub community_pool: Account<'info, TokenAccount>,
    /// CHECK: Community pool authority (rewards program)
    pub community_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = deployer,
        token::mint = mint,
        token::authority = staking_authority,
    )]
    pub staking_rewards_pool: Account<'info, TokenAccount>,
    /// CHECK: Staking pool authority (staking program)
    pub staking_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = deployer,
        token::mint = mint,
        token::authority = team_authority,
    )]
    pub team_vesting_pool: Account<'info, TokenAccount>,
    /// CHECK: Team vesting authority
    pub team_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = deployer,
        token::mint = mint,
        token::authority = treasury_authority,
    )]
    pub treasury_pool: Account<'info, TokenAccount>,
    /// CHECK: Treasury authority (governance program)
    pub treasury_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = deployer,
        token::mint = mint,
        token::authority = liquidity_authority,
    )]
    pub liquidity_pool: Account<'info, TokenAccount>,
    /// CHECK: Liquidity pool authority
    pub liquidity_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct TransferMintAuthority<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub current_authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[event]
pub struct TokenInitialized {
    pub mint: Pubkey,
    pub total_supply: u64,
    pub community_amount: u64,
    pub staking_rewards_amount: u64,
    pub team_amount: u64,
    pub treasury_amount: u64,
    pub liquidity_amount: u64,
}

#[event]
pub struct MintAuthorityTransferred {
    pub mint: Pubkey,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}
