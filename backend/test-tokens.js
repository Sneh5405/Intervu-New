const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const res = await prisma.assessment.findMany({ select: { id: true, shareableToken: true } });
    console.log(res);
}

run().catch(console.error).finally(() => prisma.$disconnect());
