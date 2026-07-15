// Client proxy utility to route all completions tasks to Groq Cloud (if API key is present), local Ollama (if online), or throw for controller JS fallback

export const cleanJsonText = (text: string): string => {
  return text.trim();
};

export const queryOllama = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  // 1. TRY GROQ CLOUD API FIRST (OpenAI-compatible endpoint)
  if (groqApiKey && groqApiKey.trim() !== '') {
    try {
      console.log(`[AI Client] Querying Groq Cloud API using model ${groqModel}...`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey.trim()}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: {
            type: 'json_object' // Guarantees strict JSON output from Groq
          },
          temperature: 0.0
        })
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          console.log(`[AI Client] SUCCESS: Generated completion using Groq Cloud API (${groqModel})`);
          return data.choices[0].message.content;
        }
      } else {
        const errDetails = await response.text();
        console.warn(`[AI Client] Groq API returned error status ${response.status}:`, errDetails);
      }
    } catch (e: any) {
      console.warn(`[AI Client] Groq query failed (${e.message}).`);
    }
  }

  // 2. TRY LOCAL OLLAMA INSTANCE SECOND
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second quick check

    console.log(`[AI Client] Attempting local Ollama query at ${ollamaUrl}...`);
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
          temperature: 0.0
        },
        format: 'json'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      if (data.message && data.message.content) {
        console.log(`[AI Client] SUCCESS: Generated completion using local model ${ollamaModel}`);
        return data.message.content;
      }
    }
    throw new Error('Invalid response structure from Ollama API.');
  } catch (err: any) {
    console.error(`[AI Client] Local Ollama not available or timed out (${err.message}).`);
    throw err; // Let the controllers handle fallback calculation
  }
};
