import { prisma } from './prisma';

const reset = async () => {
  console.log('Connecting to database...');
  
  const updated = await prisma.user.updateMany({
    data: {
      credits: 1000
    }
  });
  
  console.log(`Successfully restored 1,000 credits for all ${updated.count} users in the database!`);
};

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
