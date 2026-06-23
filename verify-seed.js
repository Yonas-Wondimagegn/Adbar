const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
async function main() {
  try {
    const users = await p.user.findMany({ select: { email: true, kycLevel: true }, orderBy: { email: true } });
    console.log("Users:", users.length);
    users.forEach(u => console.log(" ", u.email, u.kycLevel));

    const balances = await p.walletBalance.findMany({ select: { userId: true, currency: true, balance: true } });
    console.log("\nWallet Balances:", balances.length);
    balances.forEach(b => console.log(" ", b.userId.substring(0,8), b.currency, b.balance.toString()));

    const stores = await p.store.findMany({ where: { status: "PENDING_VERIFICATION" }, select: { id: true, status: true } });
    console.log("\nPending Stores:", stores.length);
    stores.forEach(s => console.log(" ", s.id.substring(0,8), s.status));
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    await p.$disconnect();
  }
}
main();
