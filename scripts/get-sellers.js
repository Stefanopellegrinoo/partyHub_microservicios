const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const partyId = parseInt(process.argv[2]);
  if (!partyId) {
    console.error("Falta PARTY_ID");
    process.exit(1);
  }

  const sellers = await prisma.event_sellers.findMany({
    where: { event_id: partyId },
    select: { seller_id: true }
  });

  console.log(JSON.stringify(sellers.map(s => s.seller_id)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
