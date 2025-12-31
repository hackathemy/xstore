/// XStore Payment Module for Movement Network
/// Handles restaurant POS payments with payment tracking and events
module xstore::payment {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::account;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_STORE_NOT_REGISTERED: u64 = 2;
    const E_PAYMENT_ALREADY_PROCESSED: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;
    const E_STORE_ALREADY_REGISTERED: u64 = 6;
    const E_REFUND_EXCEEDS_PAYMENT: u64 = 7;

    /// Store configuration
    struct Store has key {
        owner: address,
        name: String,
        wallet_address: address,
        total_received: u64,
        payment_count: u64,
        is_active: bool,
    }

    /// Payment record
    struct PaymentRecord has store, drop, copy {
        payment_id: String,
        payer: address,
        store: address,
        amount: u64,
        timestamp: u64,
        refunded_amount: u64,
    }

    /// Payment registry for tracking all payments
    struct PaymentRegistry has key {
        payments: vector<PaymentRecord>,
    }

    /// Events
    #[event]
    struct PaymentEvent has drop, store {
        payment_id: String,
        payer: address,
        store: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct RefundEvent has drop, store {
        payment_id: String,
        store: address,
        recipient: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct StoreRegisteredEvent has drop, store {
        store_address: address,
        owner: address,
        name: String,
        timestamp: u64,
    }

    /// Initialize payment registry for an account
    public entry fun initialize_registry(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<PaymentRegistry>(addr)) {
            move_to(account, PaymentRegistry {
                payments: vector::empty(),
            });
        }
    }

    /// Register a new store
    public entry fun register_store(
        owner: &signer,
        name: String,
        wallet_address: address,
    ) acquires Store {
        let owner_addr = signer::address_of(owner);

        assert!(!exists<Store>(owner_addr), E_STORE_ALREADY_REGISTERED);

        move_to(owner, Store {
            owner: owner_addr,
            name,
            wallet_address,
            total_received: 0,
            payment_count: 0,
            is_active: true,
        });

        event::emit(StoreRegisteredEvent {
            store_address: owner_addr,
            owner: owner_addr,
            name,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Process a payment from payer to store
    /// This is the main payment function
    public entry fun pay(
        payer: &signer,
        payment_id: String,
        store_address: address,
        amount: u64,
    ) acquires Store, PaymentRegistry {
        let payer_addr = signer::address_of(payer);

        // Validate amount
        assert!(amount > 0, E_INVALID_AMOUNT);

        // Check store exists and is active
        assert!(exists<Store>(store_address), E_STORE_NOT_REGISTERED);
        let store = borrow_global_mut<Store>(store_address);
        assert!(store.is_active, E_STORE_NOT_REGISTERED);

        // Transfer coins
        let coins = coin::withdraw<AptosCoin>(payer, amount);
        coin::deposit(store.wallet_address, coins);

        // Update store stats
        store.total_received = store.total_received + amount;
        store.payment_count = store.payment_count + 1;

        // Record payment
        let payment_record = PaymentRecord {
            payment_id,
            payer: payer_addr,
            store: store_address,
            amount,
            timestamp: timestamp::now_seconds(),
            refunded_amount: 0,
        };

        // Store payment record if registry exists
        if (exists<PaymentRegistry>(store_address)) {
            let registry = borrow_global_mut<PaymentRegistry>(store_address);
            vector::push_back(&mut registry.payments, payment_record);
        };

        // Emit payment event
        event::emit(PaymentEvent {
            payment_id,
            payer: payer_addr,
            store: store_address,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Simple transfer (without store registration)
    /// For direct peer-to-peer payments
    public entry fun transfer(
        sender: &signer,
        recipient: address,
        amount: u64,
    ) {
        assert!(amount > 0, E_INVALID_AMOUNT);
        coin::transfer<AptosCoin>(sender, recipient, amount);
    }

    /// Process refund from store to customer
    public entry fun refund(
        store_owner: &signer,
        payment_id: String,
        recipient: address,
        amount: u64,
    ) acquires Store {
        let store_addr = signer::address_of(store_owner);

        // Verify store ownership
        assert!(exists<Store>(store_addr), E_STORE_NOT_REGISTERED);
        let store = borrow_global<Store>(store_addr);
        assert!(store.owner == store_addr, E_NOT_AUTHORIZED);

        // Process refund
        assert!(amount > 0, E_INVALID_AMOUNT);
        coin::transfer<AptosCoin>(store_owner, recipient, amount);

        // Emit refund event
        event::emit(RefundEvent {
            payment_id,
            store: store_addr,
            recipient,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Update store wallet address
    public entry fun update_store_wallet(
        owner: &signer,
        new_wallet: address,
    ) acquires Store {
        let owner_addr = signer::address_of(owner);
        assert!(exists<Store>(owner_addr), E_STORE_NOT_REGISTERED);

        let store = borrow_global_mut<Store>(owner_addr);
        assert!(store.owner == owner_addr, E_NOT_AUTHORIZED);

        store.wallet_address = new_wallet;
    }

    /// Deactivate store
    public entry fun deactivate_store(owner: &signer) acquires Store {
        let owner_addr = signer::address_of(owner);
        assert!(exists<Store>(owner_addr), E_STORE_NOT_REGISTERED);

        let store = borrow_global_mut<Store>(owner_addr);
        assert!(store.owner == owner_addr, E_NOT_AUTHORIZED);

        store.is_active = false;
    }

    /// Reactivate store
    public entry fun reactivate_store(owner: &signer) acquires Store {
        let owner_addr = signer::address_of(owner);
        assert!(exists<Store>(owner_addr), E_STORE_NOT_REGISTERED);

        let store = borrow_global_mut<Store>(owner_addr);
        assert!(store.owner == owner_addr, E_NOT_AUTHORIZED);

        store.is_active = true;
    }

    // ========== View Functions ==========

    #[view]
    public fun get_store_info(store_address: address): (address, address, u64, u64, bool) acquires Store {
        assert!(exists<Store>(store_address), E_STORE_NOT_REGISTERED);
        let store = borrow_global<Store>(store_address);
        (store.owner, store.wallet_address, store.total_received, store.payment_count, store.is_active)
    }

    #[view]
    public fun is_store_registered(store_address: address): bool {
        exists<Store>(store_address)
    }

    #[view]
    public fun get_payment_count(store_address: address): u64 acquires Store {
        assert!(exists<Store>(store_address), E_STORE_NOT_REGISTERED);
        let store = borrow_global<Store>(store_address);
        store.payment_count
    }

    #[view]
    public fun get_total_received(store_address: address): u64 acquires Store {
        assert!(exists<Store>(store_address), E_STORE_NOT_REGISTERED);
        let store = borrow_global<Store>(store_address);
        store.total_received
    }

    // ========== Test Functions ==========

    #[test_only]
    use aptos_framework::aptos_coin;

    #[test_only]
    use std::string;

    #[test(aptos_framework = @0x1, store_owner = @0x123, customer = @0x456)]
    public fun test_payment_flow(
        aptos_framework: &signer,
        store_owner: &signer,
        customer: &signer,
    ) acquires Store, PaymentRegistry {
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let store_addr = signer::address_of(store_owner);
        let customer_addr = signer::address_of(customer);

        // Create accounts
        account::create_account_for_test(store_addr);
        account::create_account_for_test(customer_addr);

        // Initialize AptosCoin and fund accounts
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        coin::register<AptosCoin>(store_owner);
        coin::register<AptosCoin>(customer);

        // Mint coins to customer
        let coins = coin::mint<AptosCoin>(1000000000, &mint_cap); // 10 MOVE
        coin::deposit(customer_addr, coins);

        // Register store
        register_store(store_owner, string::utf8(b"Test Store"), store_addr);
        initialize_registry(store_owner);

        // Make payment
        pay(customer, string::utf8(b"payment_001"), store_addr, 100000000); // 1 MOVE

        // Verify
        let (_, _, total_received, payment_count, is_active) = get_store_info(store_addr);
        assert!(total_received == 100000000, 1);
        assert!(payment_count == 1, 2);
        assert!(is_active == true, 3);

        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}
