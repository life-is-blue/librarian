export async function generateTags(content: string): Promise<{ frontmatter: { intent: string; scope: string; keywords: string[] }; summary: string }> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    console.warn('LLM_API_KEY is not set. Returning mock response.');
    return {
      frontmatter: { intent: 'setup', scope: 'cli', keywords: ['example', 'mock'] },
      summary: 'This is a mock summary since no API key was provided.'
    };
  }

  const prompt = `Analyze this markdown document and return JSON with:
- intent: one of [setup, troubleshooting, api-ref, guide, reference]
- scope: one of [cli, terminal, ide-plugin, web, core]
- keywords: 3-5 relevant keywords as array
- summary: one sentence summary under 100 words

Document content:
${content.slice(0, 3000)}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a technical document standardizer. Return JSON ONLY, no markdown.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json() as any;
  return JSON.parse(data.choices[0].message.content);
}
