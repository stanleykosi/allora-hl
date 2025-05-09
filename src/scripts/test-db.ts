import prisma from '@/lib/prisma';

async function main() {
  try {
    // Fetch all trade logs
    const tradeLogs = await prisma.tradeLog.findMany();
    console.log('Successfully fetched trade logs:');
    console.log(JSON.stringify(tradeLogs, null, 2));

    // Count total entries
    const count = await prisma.tradeLog.count();
    console.log(`\nTotal trade logs: ${count}`);

  } catch (error) {
    console.error('Error fetching trade logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 