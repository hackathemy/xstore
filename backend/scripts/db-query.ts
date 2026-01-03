import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, name: true, walletAddress: true } });
  console.log(JSON.stringify(stores, null, 2));
  await prisma.$disconnect();
}
main();
