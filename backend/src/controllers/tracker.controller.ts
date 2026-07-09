import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { ApplicationStatus } from '@prisma/client';
import { getUserIdFromRequest } from './auth.controller';

// Seed default applications if database is empty
const seedDefaultApplications = async (userId: string) => {
  const defaults = [
    {
      userId,
      company: 'Stripe',
      role: 'Frontend Engineer',
      salary: '$145,000',
      status: ApplicationStatus.APPLIED,
      deadline: new Date('2026-07-25'),
      applicationDate: new Date('2026-06-28'),
      notes: 'Submitted resume tailored to design system proficiency.'
    },
    {
      userId,
      company: 'Linear',
      role: 'Product Engineer (React)',
      salary: '$160,000',
      status: ApplicationStatus.INTERVIEW,
      deadline: new Date('2026-07-15'),
      applicationDate: new Date('2026-06-15'),
      interviewDate: new Date('2026-07-05'),
      notes: 'Passed initial screening. Technical round scheduled.'
    },
    {
      userId,
      company: 'Notion',
      role: 'Full Stack Engineer',
      salary: '$150,000',
      status: ApplicationStatus.ASSESSMENT,
      deadline: new Date('2026-07-10'),
      applicationDate: new Date('2026-06-20'),
      notes: 'Received homework project: code a markdown block editor.'
    },
    {
      userId,
      company: 'Google',
      role: 'UX Developer',
      salary: '$180,000',
      status: ApplicationStatus.OFFER,
      deadline: new Date('2026-06-30'),
      applicationDate: new Date('2026-05-10'),
      interviewDate: new Date('2026-06-12'),
      notes: 'Offer received! Reviewing terms and equity package.'
    }
  ];

  for (const item of defaults) {
    await prisma.application.create({ data: item });
  }
};

export const getApplications = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const { jobId } = req.query;
    
    const whereClause: any = { userId };
    if (jobId) {
      if (jobId === 'general') {
        whereClause.jobId = null;
      } else {
        whereClause.jobId = jobId as string;
      }
    }
    
    let dbApps = await prisma.application.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    // Return empty list if no applications exist - no mock auto-seeding

    // Format dates to simple strings for client compatibility
    const formattedApps = dbApps.map(app => ({
      id: app.id,
      jobId: app.jobId || null,
      candidateName: app.candidateName || '',
      candidateEmail: app.candidateEmail || '',
      candidatePhone: app.candidatePhone || '',
      company: app.company,
      role: app.role,
      salary: app.salary || '',
      status: app.status,
      deadline: app.deadline ? app.deadline.toISOString().split('T')[0] : null,
      applicationDate: app.applicationDate.toISOString().split('T')[0],
      interviewDate: app.interviewDate ? app.interviewDate.toISOString().split('T')[0] : null,
      notes: app.notes || ''
    }));

    return res.json(formattedApps);
  } catch (error: any) {
    console.error('[Tracker Controller] Error fetching applications:', error);
    return res.status(500).json({ error: 'Database read error', message: error.message });
  }
};

export const createApplication = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const { company, role, salary, status, deadline, applicationDate, interviewDate, notes, jobId, candidateName, candidateEmail, candidatePhone } = req.body;

    if (!company || !role) {
      return res.status(400).json({ error: 'Company and Role are required' });
    }

    const created = await prisma.application.create({
      data: {
        userId,
        jobId: jobId || null,
        candidateName: candidateName || '',
        candidateEmail: candidateEmail || '',
        candidatePhone: candidatePhone || '',
        company,
        role,
        salary: salary || '',
        status: (status as ApplicationStatus) || ApplicationStatus.APPLIED,
        deadline: deadline ? new Date(deadline) : null,
        applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        notes: notes || ''
      }
    });

    return res.status(201).json({
      id: created.id,
      jobId: created.jobId || null,
      candidateName: created.candidateName || '',
      candidateEmail: created.candidateEmail || '',
      candidatePhone: created.candidatePhone || '',
      company: created.company,
      role: created.role,
      salary: created.salary || '',
      status: created.status,
      deadline: created.deadline ? created.deadline.toISOString().split('T')[0] : null,
      applicationDate: created.applicationDate.toISOString().split('T')[0],
      interviewDate: created.interviewDate ? created.interviewDate.toISOString().split('T')[0] : null,
      notes: created.notes || ''
    });
  } catch (error: any) {
    console.error('[Tracker Controller] Error creating application:', error);
    return res.status(500).json({ error: 'Database create error', message: error.message });
  }
};

export const updateApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if it exists
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Format dates properly for database input
    const dbUpdates: any = { ...updates };
    delete dbUpdates.id;
    delete dbUpdates.userId;
    delete dbUpdates.createdAt;
    
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline ? new Date(updates.deadline) : null;
    if (updates.applicationDate !== undefined) dbUpdates.applicationDate = new Date(updates.applicationDate);
    if (updates.interviewDate !== undefined) dbUpdates.interviewDate = updates.interviewDate ? new Date(updates.interviewDate) : null;
    if (updates.jobId !== undefined) dbUpdates.jobId = updates.jobId || null;
    if (updates.candidateName !== undefined) dbUpdates.candidateName = updates.candidateName || '';
    if (updates.candidateEmail !== undefined) dbUpdates.candidateEmail = updates.candidateEmail || '';
    if (updates.candidatePhone !== undefined) dbUpdates.candidatePhone = updates.candidatePhone || '';

    const updated = await prisma.application.update({
      where: { id },
      data: dbUpdates
    });

    return res.json({
      id: updated.id,
      jobId: updated.jobId || null,
      candidateName: updated.candidateName || '',
      candidateEmail: updated.candidateEmail || '',
      candidatePhone: updated.candidatePhone || '',
      company: updated.company,
      role: updated.role,
      salary: updated.salary || '',
      status: updated.status,
      deadline: updated.deadline ? updated.deadline.toISOString().split('T')[0] : null,
      applicationDate: updated.applicationDate.toISOString().split('T')[0],
      interviewDate: updated.interviewDate ? updated.interviewDate.toISOString().split('T')[0] : null,
      notes: updated.notes || ''
    });
  } catch (error: any) {
    console.error('[Tracker Controller] Error updating application:', error);
    return res.status(500).json({ error: 'Database update error', message: error.message });
  }
};

export const deleteApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await prisma.application.delete({ where: { id } });
    return res.json({ message: 'Application deleted successfully' });
  } catch (error: any) {
    console.error('[Tracker Controller] Error deleting application:', error);
    return res.status(500).json({ error: 'Database delete error', message: error.message });
  }
};
