import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');
  
  // 1. Fetch the first user in the database
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in database. Please register an account first in the UI.');
    return;
  }
  const userId = user.id;
  console.log(`Seeding data linked to User ID: ${userId}`);

  // 2. Seed Profile
  const profileCount = await prisma.profile.count();
  if (profileCount === 0) {
    await prisma.profile.create({
      data: {
        userId,
        firstName: 'Jane',
        lastName: 'Doe',
        headline: 'Senior Full Stack Engineer',
        targetRole: 'Full Stack Engineer'
      }
    });
    console.log('✓ Seeded Profile collection.');
  }

  // 3. Seed Resume
  const resumeCount = await prisma.resume.count();
  let resumeId = '';
  if (resumeCount === 0) {
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: 'Jane_Doe_Full_Stack_Resume.pdf',
        score: 75,
        atsScore: 78,
        formattingAnalysis: { score: 80, rating: 'Excellent', details: 'Clear sections detected.' },
        grammarAnalysis: { score: 75, rating: 'Good', details: 'No spelling errors found.' },
        skillAnalysis: { score: 80, rating: 'High Match', identifiedSkills: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB'], missingSkills: ['Docker'] },
        projectAnalysis: { score: 85, rating: 'Good', details: 'Quantified outcomes present.' },
        experienceAnalysis: { score: 70, rating: 'Needs Work', details: 'Weak verb usage detected.' },
        achievementAnalysis: { score: 80, rating: 'Good', details: 'Metrics matched.' },
        strengths: ['Formatting matches templates', 'Solid technical stack'],
        weaknesses: ['Missing Docker and Cloud details'],
        suggestions: ['Quantify query speeds and Docker scaling.']
      }
    });
    resumeId = resume.id;
    console.log('✓ Seeded Resume collection.');
  } else {
    const firstResume = await prisma.resume.findFirst();
    if (firstResume) resumeId = firstResume.id;
  }

  // 4. Seed ResumeVersion
  const versionCount = await prisma.resumeVersion.count();
  if (versionCount === 0 && resumeId) {
    await prisma.resumeVersion.create({
      data: {
        resumeId,
        title: 'Jane_Doe_Full_Stack_Resume_v2.pdf',
        versionNumber: 2,
        tailoredForJobId: 'job-123'
      }
    });
    console.log('✓ Seeded ResumeVersion collection.');
  }

  // 5. Seed Job
  const jobCount = await prisma.job.count();
  if (jobCount === 0) {
    await prisma.job.create({
      data: {
        userId,
        title: 'Full Stack Developer',
        company: 'Linear Inc.',
        description: 'React, Node.js, and MongoDB development required.',
        matchScore: 82,
        reqSkills: ['React', 'TypeScript', 'Node.js', 'MongoDB'],
        missingSkills: ['Docker'],
        expMatch: 'Partial Match',
        eduMatch: 'Match',
        recommendationSummary: 'Your resume shows strong alignments, but lacks Docker details.'
      }
    });
    console.log('✓ Seeded Job collection.');
  }

  // 6. Seed Application
  const appCount = await prisma.application.count();
  if (appCount === 0) {
    await prisma.application.create({
      data: {
        userId,
        company: 'Google',
        role: 'Software Engineer',
        salary: '$140,000 - $160,000',
        status: 'INTERVIEW',
        notes: 'Tech round scheduled next week.'
      }
    });
    console.log('✓ Seeded Application collection.');
  }

  // 7. Seed CoverLetter
  const clCount = await prisma.coverLetter.count();
  if (clCount === 0) {
    await prisma.coverLetter.create({
      data: {
        userId,
        jobTitle: 'Software Engineer',
        company: 'Vercel',
        content: 'Dear Hiring Manager, I am writing to express my interest...'
      }
    });
    console.log('✓ Seeded CoverLetter collection.');
  }

  // 8. Seed InterviewSession
  const sessionCount = await prisma.interviewSession.count();
  if (sessionCount === 0) {
    await prisma.interviewSession.create({
      data: {
        userId,
        type: 'TECHNICAL',
        questionsJson: [
          { id: 'q1', type: 'TECHNICAL', question: 'Explain virtual DOM', idealAnswer: 'An in-memory copy of the DOM.' }
        ],
        feedbackJson: { score: 85, evaluation: 'Strong technical explanation.' },
        historyJson: { role: 'React Engineer', company: 'Supabase' }
      }
    });
    console.log('✓ Seeded InterviewSession collection.');
  }

  // 9. Seed AiChat
  const chatCount = await prisma.aiChat.count();
  if (chatCount === 0) {
    await prisma.aiChat.create({
      data: {
        userId,
        category: 'RESUME',
        messagesJson: [
          { sender: 'user', text: 'How do I optimize my project section?' },
          { sender: 'assistant', text: 'Quantify your accomplishments using percentages and timelines.' }
        ]
      }
    });
    console.log('✓ Seeded AiChat collection.');
  }

  // 10. Seed Payment
  const paymentCount = await prisma.payment.count();
  if (paymentCount === 0) {
    await prisma.payment.create({
      data: {
        userId,
        amount: 49.00,
        status: 'SUCCESS',
        transactionId: 'pay_rzp_mock_12345'
      }
    });
    console.log('✓ Seeded Payment collection.');
  }

  // 11. Seed Subscription
  const subCount = await prisma.subscription.count();
  if (subCount === 0) {
    await prisma.subscription.create({
      data: {
        userId,
        status: 'ACTIVE',
        plan: 'PREMIUM',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });
    console.log('✓ Seeded Subscription collection.');
  }

  console.log('Database seeding successfully finished!');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
