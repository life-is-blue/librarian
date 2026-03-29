export async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    // For demo/dev purposes if key is missing, return a mock or throw
    // The user didn't specify credentials, so I'll implement the structure.
    console.warn('LLM_API_KEY is not set. Returning mock response.');
    return JSON.stringify({
      intent: 'setup',
      scope: 'cli',
      keywords: ['example', 'mock'],
      summary: 'This is a mock summary since no API key was provided.'
    });
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a technical document standardizer. Return JSON ONLY.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json() as any;
  return data.choices[0].message.content;
}
