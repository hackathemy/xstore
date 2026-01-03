import { PrismaClient } from '@prisma/client';
import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  InputEntryFunctionData,
} from '@aptos-labs/ts-sdk';

const TUSDC_MODULE_ADDRESS = '0x60a2f32cde9ddf5b3e73e207f124642390ef839d8b76d05d009235b0dc4b20ce';
const TUSDC_COIN_TYPE = `${TUSDC_MODULE_ADDRESS}::tusdc::TUSDC`;
const MOVEMENT_NODE_URL = 'https://testnet.movementnetwork.xyz/v1';

// Using the address that matches the private key we have (TUSDC deployer/facilitator)
// This address is already registered for TUSDC
const NEW_WALLET_ADDRESS = '0x60a2f32cde9ddf5b3e73e207f124642390ef839d8b76d05d009235b0dc4b20ce';
const PRIVATE_KEY = 'f308f69220828c9bba527f18de32739a1617bd827f24ace92c33d11ba96dd8d3';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // 1. Update store wallet address in DB
    console.log('=== Step 1: Update Store Wallet Address ===');
    const updated = await prisma.store.updateMany({
      data: { walletAddress: NEW_WALLET_ADDRESS }
    });
    console.log(`Updated ${updated.count} store(s) with new wallet address: ${NEW_WALLET_ADDRESS}`);

    // Verify update
    const stores = await prisma.store.findMany({ select: { id: true, name: true, walletAddress: true } });
    console.log('Updated stores:', JSON.stringify(stores, null, 2));

    // 2. Register for TUSDC using the private key
    console.log('\n=== Step 2: Register for TUSDC ===');
    
    // Initialize Aptos SDK
    const aptosConfig = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: MOVEMENT_NODE_URL,
    });
    const aptos = new Aptos(aptosConfig);

    // Create account from private key
    const ed25519Key = new Ed25519PrivateKey(PRIVATE_KEY);
    const account = Account.fromPrivateKey({ privateKey: ed25519Key });
    
    const derivedAddress = account.accountAddress.toString();
    console.log(`Derived address from private key: ${derivedAddress}`);
    
    // Verify the address matches
    if (derivedAddress.toLowerCase() !== NEW_WALLET_ADDRESS.toLowerCase()) {
      console.log('⚠️ Warning: Derived address does not match the target wallet address!');
      console.log(`Expected: ${NEW_WALLET_ADDRESS}`);
      console.log(`Got: ${derivedAddress}`);
      // Continue anyway - the user provided both the address and private key
    }

    // Check if already registered
    console.log('\nChecking if already registered for TUSDC...');
    try {
      const resources = await aptos.getAccountResources({ accountAddress: derivedAddress });
      const coinStoreType = `0x1::coin::CoinStore<${TUSDC_COIN_TYPE}>`;
      const hasCoinStore = resources.some((r: any) => r.type === coinStoreType);
      
      if (hasCoinStore) {
        console.log('✅ Address is already registered for TUSDC!');
        return;
      }
    } catch (error: any) {
      if (!error.message?.includes('Account not found')) {
        console.log(`Resource check error: ${error.message}`);
      }
    }

    // Register for TUSDC
    console.log('Registering for TUSDC...');
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: '0x1::managed_coin::register',
        typeArguments: [TUSDC_COIN_TYPE],
        functionArguments: [],
      } as InputEntryFunctionData,
    });

    const pendingTx = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log(`Transaction submitted: ${pendingTx.hash}`);

    const committedTx = await aptos.waitForTransaction({
      transactionHash: pendingTx.hash,
    });

    if (committedTx.success) {
      console.log('✅ Successfully registered for TUSDC!');
      console.log(`Transaction hash: ${pendingTx.hash}`);
      console.log(`Explorer: https://explorer.movementlabs.xyz/txn/${pendingTx.hash}?network=testnet`);
    } else {
      console.log('❌ Registration failed:', (committedTx as any).vm_status);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
