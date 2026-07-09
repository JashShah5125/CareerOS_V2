import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getUserIdFromRequest } from './auth.controller';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    
    // Find active database subscription record
    const sub = await prisma.subscription.findFirst({
      where: { userId }
    });
    
    let plan = 'Free Plan';
    let price = '₹0';
    let status = 'ACTIVE';
    let nextBillingDate = '2026-08-28';
    
    if (sub) {
      plan = sub.plan === 'FREE' ? 'Free Plan' : sub.plan === 'PRO' ? 'Pro Plan' : sub.plan === 'PREMIUM' ? 'Premium Plan' : `${sub.plan} Plan`;
      price = sub.plan === 'FREE' ? '₹0' : sub.plan === 'PRO' ? '₹499' : '₹999';
      status = sub.status;
      nextBillingDate = sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString().split('T')[0] : '2026-08-28';
    }

    return res.json({
      theme: 'dark',
      notifications: {
        emailAlerts: true,
        deadlineReminders: true,
        weeklySummary: false
      },
      subscription: {
        plan,
        status,
        billingPeriod: 'monthly',
        price,
        nextBillingDate
      },
      billing: {
        cardBrand: 'Visa',
        last4: '4242',
        billingEmail: 'user@example.com'
      }
    });
  } catch (error: any) {
    console.error('[Settings Controller] Error loading settings:', error);
    return res.status(500).json({ error: 'Failed to load settings.' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromRequest(req);
    const updates = req.body;
    
    if (updates.subscription) {
      const incomingPlan = updates.subscription.plan || 'Free Plan';
      let dbPlan = 'FREE';
      if (incomingPlan.includes('Pro')) dbPlan = 'PRO';
      if (incomingPlan.includes('Premium')) dbPlan = 'PREMIUM';
      
      const nextPeriod = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const existingSub = await prisma.subscription.findFirst({
        where: { userId }
      });
      
      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            plan: dbPlan,
            status: 'ACTIVE',
            currentPeriodEnd: nextPeriod
          }
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId,
            plan: dbPlan,
            status: 'ACTIVE',
            currentPeriodEnd: nextPeriod
          }
        });
      }

      // Log Payment transaction record in database
      const transactionId = updates.subscription.transactionId;
      if (transactionId) {
        const existingPayment = await prisma.payment.findUnique({
          where: { transactionId }
        });
        if (!existingPayment) {
          await prisma.payment.create({
            data: {
              userId,
              amount: Number(updates.subscription.paymentAmount) || (dbPlan === 'PRO' ? 499 : 1199),
              status: 'SUCCESS',
              transactionId
            }
          });
        }
      }
    }

    return res.json({
      message: 'Settings updated successfully',
      updatedSettings: updates
    });
  } catch (error: any) {
    console.error('[Settings Controller] Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
};

// Check local Ollama connection or Groq API status based on env setup
export const getModelStatus = async (req: Request, res: Response) => {
  try {
    const nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    
    // Fetch status directly from the local Python FastAPI NLP Microservice
    const response = await fetch(`${nlpServiceUrl}/api/v1/status`);
    if (!response.ok) {
      return res.json({
        status: 'OFFLINE',
        model: 'Local Cosine Similarity Matrix',
        ollamaUrl: nlpServiceUrl,
        modelPulled: false,
        availableModels: [],
        error: 'FastAPI NLP Microservice returned error code'
      });
    }
    
    const data = await response.json() as any;
    
    return res.json({
      status: data.status,
      model: data.model,
      ollamaUrl: data.endpoint,
      modelPulled: data.status === 'ONLINE',
      availableModels: data.modelsPulled || [data.model],
      error: `Connected via Port 8000 Python NLP Microservice (${data.engine})`
    });
  } catch (err: any) {
    return res.json({
      status: 'OFFLINE',
      model: 'Local Cosine Similarity Matrix',
      ollamaUrl: 'http://localhost:8000',
      modelPulled: false,
      availableModels: [],
      error: `Connection to Port 8000 Python NLP Service failed: ${err.message}`
    });
  }
};
