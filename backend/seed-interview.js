const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Fetch Users
    const hr = await prisma.user.findUnique({ where: { email: 'hr@intervue.com' } });
    const interviewer = await prisma.user.findUnique({ where: { email: 'interviewer@intervue.com' } });
    const candidate = await prisma.user.findUnique({ where: { email: 'candidate@intervue.com' } });

    if (!hr || !interviewer || !candidate) {
        throw new Error("Missing required users. Please run seed-users.js first.");
    }

    // 2. Create Interview (Scheduled for 1 hour from now)
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 5); // Start in 5 mins
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const interview = await prisma.interview.create({
        data: {
            startTime: startTime,
            endTime: endTime,
            status: 'SCHEDULED',
            round: 1,
            meetLink: 'https://meet.google.com/test-link',
            hrId: hr.id,
            interviewerId: interviewer.id,
            intervieweeId: candidate.id
        }
    });

    console.log("✅ Interview Created Successfully!");
    console.log(`ID: ${interview.id}`);
    console.log(`Time: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);
    console.log(`Interviewer: ${interviewer.name} (${interviewer.email})`);
    console.log(`Candidate: ${candidate.name} (${candidate.email})`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
