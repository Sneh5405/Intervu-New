const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Find the user (sneh54/gondaliyasneh@gmail.com)
        // We know ID 10 from previous debug
        const user = await prisma.user.update({
            where: { id: 10 },
            data: {
                role: 'HR',
                status: 'ACTIVE' // Ensure it is active
            }
        });
        console.log("Updated user to HR:", user);
    } catch (e) {
        console.error("Failed to update user", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
