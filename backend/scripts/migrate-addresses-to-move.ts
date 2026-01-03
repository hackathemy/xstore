/**
 * Database Migration Script: Convert EVM addresses to Move format
 *
 * EVM address: 40 hex chars (20 bytes) - e.g., 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 * Move address: 64 hex chars (32 bytes) - e.g., 0x000000000000000000000000f39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 *
 * This script converts all EVM format addresses in the database to Move format
 * by left-padding with zeros.
 *
 * Usage: npx ts-node scripts/migrate-addresses-to-move.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if an address is in EVM format (40 hex chars)
 */
function isEvmAddress(address: string | null): boolean {
  if (!address) return false;
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  return /^[0-9a-fA-F]{40}$/.test(cleanAddress);
}

/**
 * Convert EVM address to Move format (left-pad with zeros)
 */
function evmToMoveAddress(address: string): string {
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  // Left-pad to 64 characters
  return `0x${cleanAddress.padStart(64, '0')}`;
}

interface MigrationResult {
  table: string;
  field: string;
  id: string;
  oldValue: string;
  newValue: string;
}

async function migrateAddresses() {
  const results: MigrationResult[] = [];
  let totalConverted = 0;

  console.log('🔄 Starting EVM to Move address migration...\n');

  // 1. Migrate Store addresses (walletAddress, owner)
  console.log('📦 Checking Store table...');
  const stores = await prisma.store.findMany({
    select: { id: true, walletAddress: true, owner: true },
  });

  for (const store of stores) {
    if (isEvmAddress(store.walletAddress)) {
      const newAddress = evmToMoveAddress(store.walletAddress!);
      await prisma.store.update({
        where: { id: store.id },
        data: { walletAddress: newAddress },
      });
      results.push({
        table: 'Store',
        field: 'walletAddress',
        id: store.id,
        oldValue: store.walletAddress!,
        newValue: newAddress,
      });
      totalConverted++;
    }

    if (isEvmAddress(store.owner)) {
      const newAddress = evmToMoveAddress(store.owner!);
      await prisma.store.update({
        where: { id: store.id },
        data: { owner: newAddress },
      });
      results.push({
        table: 'Store',
        field: 'owner',
        id: store.id,
        oldValue: store.owner!,
        newValue: newAddress,
      });
      totalConverted++;
    }
  }
  console.log(`   Found ${stores.length} stores, converted ${results.filter(r => r.table === 'Store').length} addresses`);

  // 2. Migrate Order addresses (customer)
  console.log('📦 Checking Order table...');
  const orders = await prisma.order.findMany({
    select: { id: true, customer: true },
  });

  const ordersBefore = results.length;
  for (const order of orders) {
    if (isEvmAddress(order.customer)) {
      const newAddress = evmToMoveAddress(order.customer!);
      await prisma.order.update({
        where: { id: order.id },
        data: { customer: newAddress },
      });
      results.push({
        table: 'Order',
        field: 'customer',
        id: order.id,
        oldValue: order.customer!,
        newValue: newAddress,
      });
      totalConverted++;
    }
  }
  console.log(`   Found ${orders.length} orders, converted ${results.length - ordersBefore} addresses`);

  // 3. Migrate Reservation addresses (customer)
  console.log('📦 Checking Reservation table...');
  const reservations = await prisma.reservation.findMany({
    select: { id: true, customer: true },
  });

  const reservationsBefore = results.length;
  for (const reservation of reservations) {
    if (isEvmAddress(reservation.customer)) {
      const newAddress = evmToMoveAddress(reservation.customer!);
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { customer: newAddress },
      });
      results.push({
        table: 'Reservation',
        field: 'customer',
        id: reservation.id,
        oldValue: reservation.customer!,
        newValue: newAddress,
      });
      totalConverted++;
    }
  }
  console.log(`   Found ${reservations.length} reservations, converted ${results.length - reservationsBefore} addresses`);

  // 4. Migrate Tab addresses (customer)
  console.log('📦 Checking Tab table...');
  const tabs = await prisma.tab.findMany({
    select: { id: true, customer: true },
  });

  const tabsBefore = results.length;
  for (const tab of tabs) {
    if (isEvmAddress(tab.customer)) {
      const newAddress = evmToMoveAddress(tab.customer!);
      await prisma.tab.update({
        where: { id: tab.id },
        data: { customer: newAddress },
      });
      results.push({
        table: 'Tab',
        field: 'customer',
        id: tab.id,
        oldValue: tab.customer!,
        newValue: newAddress,
      });
      totalConverted++;
    }
  }
  console.log(`   Found ${tabs.length} tabs, converted ${results.length - tabsBefore} addresses`);

  // 5. Migrate Payment addresses (payerAddress, tokenAddress)
  console.log('📦 Checking Payment table...');
  const payments = await prisma.payment.findMany({
    select: { id: true, payerAddress: true, tokenAddress: true },
  });

  const paymentsBefore = results.length;
  for (const payment of payments) {
    if (isEvmAddress(payment.payerAddress)) {
      const newAddress = evmToMoveAddress(payment.payerAddress!);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { payerAddress: newAddress },
      });
      results.push({
        table: 'Payment',
        field: 'payerAddress',
        id: payment.id,
        oldValue: payment.payerAddress!,
        newValue: newAddress,
      });
      totalConverted++;
    }

    if (isEvmAddress(payment.tokenAddress)) {
      const newAddress = evmToMoveAddress(payment.tokenAddress!);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { tokenAddress: newAddress },
      });
      results.push({
        table: 'Payment',
        field: 'tokenAddress',
        id: payment.id,
        oldValue: payment.tokenAddress!,
        newValue: newAddress,
      });
      totalConverted++;
    }
  }
  console.log(`   Found ${payments.length} payments, converted ${results.length - paymentsBefore} addresses`);

  // 6. Migrate Refund addresses (requestedBy)
  console.log('📦 Checking Refund table...');
  const refunds = await prisma.refund.findMany({
    select: { id: true, requestedBy: true },
  });

  const refundsBefore = results.length;
  for (const refund of refunds) {
    if (isEvmAddress(refund.requestedBy)) {
      const newAddress = evmToMoveAddress(refund.requestedBy!);
      await prisma.refund.update({
        where: { id: refund.id },
        data: { requestedBy: newAddress },
      });
      results.push({
        table: 'Refund',
        field: 'requestedBy',
        id: refund.id,
        oldValue: refund.requestedBy!,
        newValue: newAddress,
      });
      totalConverted++;
    }
  }
  console.log(`   Found ${refunds.length} refunds, converted ${results.length - refundsBefore} addresses`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total addresses converted: ${totalConverted}`);

  if (results.length > 0) {
    console.log('\nDetailed changes:');
    for (const result of results) {
      console.log(`  ${result.table}.${result.field} (${result.id}):`);
      console.log(`    Old: ${result.oldValue}`);
      console.log(`    New: ${result.newValue}`);
    }
  } else {
    console.log('\n✅ No EVM format addresses found in the database.');
    console.log('   All addresses are already in Move format (64 hex chars).');
  }

  console.log('\n✅ Migration completed successfully!');
}

// Run the migration
migrateAddresses()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
