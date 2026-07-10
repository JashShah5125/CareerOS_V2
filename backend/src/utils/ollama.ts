// Client proxy utility to route all completions tasks directly to the local Ollama API instance

export const cleanJsonText = (text: string): string => {
  return text.trim();
};

export const queryOllama = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.3
        },
        format: 'json' // Enforces strict JSON output schemas from Ollama
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with status: ${response.status}`);
    }

    const data: any = await response.json();
    if (data.message && data.message.content) {
      console.log(`[Ollama Client] Successfully generated completion using local model ${ollamaModel}`);
      return data.message.content;
    }
    
    throw new Error('Invalid response structure from Ollama API.');
  } catch (err: any) {
    console.error(`[Ollama Client] Failed to query local model ${ollamaModel}:`, err.message);
    throw err; // Let the controllers handle fallback calculations
  }
};
