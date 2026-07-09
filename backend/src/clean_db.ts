import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up mock seeded database records...');

  // 1. Delete mock ResumeVersion
  const rvDel = await prisma.resumeVersion.deleteMany({
    where: { tailoredForJobId: 'job-123' }
  });
  console.log(`Deleted ${rvDel.count} mock ResumeVersion documents.`);

  // 2. Delete mock CoverLetter
  const clDel = await prisma.coverLetter.deleteMany({
    where: { content: { startsWith: 'Dear Hiring Manager, I am writing to express my interest...' } }
  });
  console.log(`Deleted ${clDel.count} mock CoverLetter documents.`);

  // 3. Delete mock InterviewSession
  const isDel = await prisma.interviewSession.deleteMany({
    where: {
      type: 'TECHNICAL',
      historyJson: { equals: { company: 'Supabase', role: 'React Engineer' } } as any
    }
  });
  console.log(`Deleted ${isDel.count} mock InterviewSession documents.`);

  // 4. Delete mock AiChat
  const acDel = await prisma.aiChat.deleteMany({
    where: {
      category: 'RESUME',
      messagesJson: { equals: [
        { sender: 'user', text: 'How do I optimize my project section?' },
        { sender: 'assistant', text: 'Quantify your accomplishments using percentages and timelines.' }
      ] } as any
    }
  });
  console.log(`Deleted ${acDel.count} mock AiChat documents.`);

  // 5. Delete mock Payment
  const pyDel = await prisma.payment.deleteMany({
    where: { transactionId: 'pay_rzp_mock_12345' }
  });
  console.log(`Deleted ${pyDel.count} mock Payment documents.`);

  // 6. Delete mock Subscription
  const subDel = await prisma.subscription.deleteMany({
    where: { plan: 'PREMIUM', status: 'ACTIVE' }
  });
  console.log(`Deleted ${subDel.count} mock Subscription documents.`);

  // 7. Delete mock Job
  const jobDel = await prisma.job.deleteMany({
    where: { company: 'Linear Inc.', description: 'React, Node.js, and MongoDB development required.' }
  });
  console.log(`Deleted ${jobDel.count} mock Job documents.`);

  // 8. Delete mock Resume
  const resDel = await prisma.resume.deleteMany({
    where: { title: 'Jane_Doe_Full_Stack_Resume.pdf' }
  });
  console.log(`Deleted ${resDel.count} mock Resume documents.`);

  // 9. Delete mock Applications
  const appDel = await prisma.application.deleteMany({
    where: {
      company: { in: ['Stripe', 'Linear', 'Notion', 'Google'] }
    }
  });
  console.log(`Deleted ${appDel.count} mock Application documents.`);

  console.log('Database cleanup finished successfully!');
}

main()
  .catch(e => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
