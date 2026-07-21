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
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey && groqApiKey.trim() !== '') {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });

      if (response.ok) {
        return res.json({
          status: 'ONLINE',
          model: 'llama-3.3-70b-versatile',
          ollamaUrl: 'https://api.groq.com (Groq Cloud)',
          modelPulled: true,
          availableModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
          error: ''
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Groq returned status ${response.status}`);
      }
    } catch (err: any) {
      return res.json({
        status: 'OFFLINE',
        model: 'llama-3.3-70b-versatile',
        ollamaUrl: 'https://api.groq.com (Groq Cloud)',
        modelPulled: false,
        availableModels: [],
        error: `Connection to Groq Cloud failed: ${err.message}`
      });
    }
  }

  // Fallback to local Ollama check if GROQ_API_KEY is not configured
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const targetModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json() as any;
    const models = data.models || [];
    const modelNames = models.map((m: any) => m.name);
    
    // Check if our target model is pulled
    const targetModelClean = targetModel.toLowerCase().trim();
    const isPulled = modelNames.some((name: string) => 
      name.toLowerCase().includes(targetModelClean) || targetModelClean.includes(name.toLowerCase())
    );

    return res.json({
      status: 'ONLINE',
      model: targetModel,
      ollamaUrl: ollamaUrl,
      modelPulled: isPulled,
      availableModels: modelNames,
      error: ''
    });
  } catch (err: any) {
    return res.json({
      status: 'OFFLINE',
      model: targetModel,
      ollamaUrl: ollamaUrl,
      modelPulled: false,
      availableModels: [],
      error: `Connection to local Ollama failed: ${err.message}`
    });
  }
};
