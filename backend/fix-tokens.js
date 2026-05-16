const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function fix() {
    const ass = await prisma.assessment.findMany({ where: { shareableToken: null } });
    for (const a of ass) {
        await prisma.assessment.update({
            where: { id: a.id },
            data: { shareableToken: crypto.randomUUID() }
        });
    }
    console.log('Fixed ' + ass.length + ' assessments.');
}

fix()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
