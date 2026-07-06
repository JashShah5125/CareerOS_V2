// Utility for querying local Ollama instance or Groq LPU Cloud API

// Helper to clean conversational text, markdown tags, and extract pure JSON structures
export const cleanJsonText = (text: string): string => {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  
  let startIdx = -1;
  let endToken = '';
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endToken = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endToken = ']';
  }
  
  if (startIdx === -1) {
    return text.trim();
  }
  
  const lastIdx = text.lastIndexOf(endToken);
  if (lastIdx === -1 || lastIdx < startIdx) {
    return text.trim();
  }
  
  let extracted = text.substring(startIdx, lastIdx + 1).trim();

  // Remove trailing commas before closing braces/brackets
  extracted = extracted.replace(/,\s*([}\]])/g, '$1');

  return extracted;
};

export const queryOllama = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (groqApiKey) {
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    
    // Query Groq OpenAI-compatible endpoint directly
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API returned status ${response.status}: ${errText}`);
    }
    
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API returned empty response content.');
    }
    
    return content.trim();
  }

  // Fallback to local Ollama directly
  const modelName = process.env.OLLAMA_MODEL || 'qwen3-0.6b-instruct';
  const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
  
  const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama server returned status ${response.status}: ${errText}`);
  }
  
  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Ollama returned empty response body content.');
  }
  
  return content.trim();
};
