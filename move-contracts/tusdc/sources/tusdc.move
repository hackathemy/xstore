/// TUSDC - Test USD Coin for XStore
/// A simple fungible coin for testing purposes on Movement Network
module tusdc::tusdc {
    use std::string;
    use std::signer;
    use std::option;
    use aptos_framework::coin::{Self, MintCapability, BurnCapability, FreezeCapability};

    /// The TUSDC coin type
    struct TUSDC has key {}

    /// Capabilities for managing TUSDC
    struct Capabilities has key {
        mint_cap: MintCapability<TUSDC>,
        burn_cap: BurnCapability<TUSDC>,
        freeze_cap: FreezeCapability<TUSDC>,
    }

    /// Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;

    /// Initialize the TUSDC coin
    /// This should only be called once during module deployment
    fun init_module(admin: &signer) {
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<TUSDC>(
            admin,
            string::utf8(b"Test USD Coin"),
            string::utf8(b"TUSDC"),
            6, // 6 decimals like real USDC
            true, // monitor supply
        );

        move_to(admin, Capabilities {
            mint_cap,
            burn_cap,
            freeze_cap,
        });
    }

    /// Register a coin store for an account
    public entry fun register(account: &signer) {
        coin::register<TUSDC>(account);
    }

    /// Mint TUSDC tokens to a recipient (admin only)
    public entry fun mint(
        admin: &signer,
        recipient: address,
        amount: u64
    ) acquires Capabilities {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Capabilities>(admin_addr), E_NOT_ADMIN);

        let caps = borrow_global<Capabilities>(admin_addr);
        let coins = coin::mint<TUSDC>(amount, &caps.mint_cap);
        coin::deposit(recipient, coins);
    }

    /// Burn TUSDC tokens from caller's account
    public entry fun burn(
        account: &signer,
        amount: u64
    ) acquires Capabilities {
        let admin_addr = @tusdc;
        let caps = borrow_global<Capabilities>(admin_addr);
        let coins = coin::withdraw<TUSDC>(account, amount);
        coin::burn(coins, &caps.burn_cap);
    }

    /// Transfer TUSDC tokens
    public entry fun transfer(
        from: &signer,
        to: address,
        amount: u64
    ) {
        coin::transfer<TUSDC>(from, to, amount);
    }

    /// Get balance of an account
    #[view]
    public fun balance(account: address): u64 {
        if (coin::is_account_registered<TUSDC>(account)) {
            coin::balance<TUSDC>(account)
        } else {
            0
        }
    }

    /// Check if an account is registered
    #[view]
    public fun is_registered(account: address): bool {
        coin::is_account_registered<TUSDC>(account)
    }

    /// Get total supply
    #[view]
    public fun total_supply(): u128 {
        let supply = coin::supply<TUSDC>();
        if (option::is_some(&supply)) {
            option::extract(&mut supply)
        } else {
            0
        }
    }

    #[test_only]
    public fun init_for_test(admin: &signer) {
        init_module(admin);
    }
}
