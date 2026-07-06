import { prisma } from './prisma';

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: { profile: true }
    });
    console.log('Database connected successfully. Total Users:', users.length);
    users.forEach(u => {
      console.log(`- User ID: ${u.id}, Email: ${u.email}, Credits: ${u.credits}, Profile Name: ${u.profile?.firstName} ${u.profile?.lastName}`);
    });
  } catch (error) {
    console.error('Database query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
