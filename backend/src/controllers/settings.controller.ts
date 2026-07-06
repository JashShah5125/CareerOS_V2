import { Request, Response } from 'express';

export const getSettings = async (req: Request, res: Response) => {
  return res.json({
    theme: 'dark',
    notifications: {
      emailAlerts: true,
      deadlineReminders: true,
      weeklySummary: false
    },
    subscription: {
      plan: 'Free Plan',
      status: 'ACTIVE',
      billingPeriod: 'monthly',
      price: '₹0',
      nextBillingDate: '2026-07-28'
    },
    billing: {
      cardBrand: 'Visa',
      last4: '4242',
      billingEmail: 'user@example.com'
    }
  });
};

export const updateSettings = async (req: Request, res: Response) => {
  const updates = req.body;
  return res.json({
    message: 'Settings updated successfully',
    updatedSettings: updates
  });
};

// Check local Ollama connection or Groq API status based on env setup
export const getModelStatus = async (req: Request, res: Response) => {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      const maskedKey = groqApiKey.substring(0, 8) + '...' + groqApiKey.substring(groqApiKey.length - 4);
      return res.json({
        status: 'ONLINE',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        ollamaUrl: 'https://api.groq.com/openai/v1',
        modelPulled: true,
        availableModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
        error: `Active Groq LPU Engine (Key: ${maskedKey})`
      });
    }

    const modelName = process.env.OLLAMA_MODEL || 'qwen3-0.6b-instruct';
    const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) {
      return res.json({
        status: 'OFFLINE',
        model: modelName,
        ollamaUrl,
        modelPulled: false,
        availableModels: [],
        error: 'Ollama service returned error code'
      });
    }
    
    const data = await response.json() as any;
    const modelsList = data.models || [];
    
    const modelExists = modelsList.some((m: any) => {
      const nameLower = m.name.toLowerCase();
      return nameLower.includes('qwen3') || nameLower.includes('qwen') || nameLower.includes(modelName.toLowerCase());
    });
    
    return res.json({
      status: 'ONLINE',
      model: modelName,
      ollamaUrl,
      modelPulled: modelExists,
      availableModels: modelsList.map((m: any) => m.name)
    });
  } catch (err: any) {
    return res.json({
      status: 'OFFLINE',
      model: process.env.OLLAMA_MODEL || 'qwen3-0.6b-instruct',
      ollamaUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
      modelPulled: false,
      availableModels: [],
      error: err.message
    });
  }
};
