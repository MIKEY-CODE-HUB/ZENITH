import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run destructive demo reset in PRODUCTION environment!');
  }

  console.log('⚠️ Running DEVELOPMENT-ONLY clean slate reset...');
  await prisma.focusEvent.deleteMany({});
  await prisma.blockerSession.deleteMany({});
  await prisma.blockAttempt.deleteMany({});
  await prisma.pointTransaction.deleteMany({});
  await prisma.focusSession.deleteMany({});
  await prisma.interactionAuthorization.deleteMany({});
  await prisma.roomParticipant.deleteMany({});

  console.log('✅ Development demo state cleared.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Reset error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
