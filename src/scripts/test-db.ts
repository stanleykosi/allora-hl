import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connection successful');

    // Fetch all trade logs
    console.log('\nFetching trade logs...');
    const tradeLogs = await prisma.tradeLog.findMany({
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    console.log('\nMost recent trade logs:');
    console.log(JSON.stringify(tradeLogs, null, 2));

    // Count total entries
    const count = await prisma.tradeLog.count();
    console.log(`\nTotal trade logs: ${count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 