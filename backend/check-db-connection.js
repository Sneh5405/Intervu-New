const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to connect to the database...');
    try {
        await prisma.$connect();
        console.log('✅ Successfully connected to the database.');

        // Optional: Try a simple query to ensure read access
        try {
            const userCount = await prisma.user.count();
            console.log(`✅ Read access confirmed. User count: ${userCount}`);
        } catch (readError) {
            console.warn('⚠️ Connected but failed to read users table:', readError.message);
        }

    } catch (e) {
        console.error('❌ Failed to connect to the database:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
