export async function generateTags(content: string): Promise<{ frontmatter: { intent: string; scope: string; keywords: string[] }; summary: string }> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const allowMock = process.env.LIBRARIAN_ALLOW_MOCK_LLM === "1";
  const model = process.env.LLM_MODEL || "gpt-4o";

  if (!apiKey) {
    if (!allowMock) {
      throw new Error(
        "LLM_API_KEY is required for standardization. Set LLM_API_KEY or LIBRARIAN_ALLOW_MOCK_LLM=1 to allow mock tags."
      );
    }
    console.warn("LLM_API_KEY is not set. LIBRARIAN_ALLOW_MOCK_LLM=1 enabled; returning mock response.");
    return {
      frontmatter: { intent: "setup", scope: "cli", keywords: ["example", "mock"] },
      summary: "This is a mock summary since no API key was provided."
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a technical document standardizer. Return JSON ONLY, no markdown." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as any;
  const contentRaw = data?.choices?.[0]?.message?.content;
  if (typeof contentRaw !== "string") {
    throw new Error("LLM response missing choices[0].message.content");
  }

  const parsed = JSON.parse(contentRaw) as any;
  const frontmatter = typeof parsed.frontmatter === "object" && parsed.frontmatter ? parsed.frontmatter : parsed;
  const intent = String(frontmatter?.intent || "guide");
  const scope = String(frontmatter?.scope || "core");
  const keywords = Array.isArray(frontmatter?.keywords)
    ? frontmatter.keywords.map((keyword: unknown) => String(keyword)).filter(Boolean).slice(0, 8)
    : ["documentation"];
  const summary = String(parsed.summary || frontmatter.summary || "No summary provided.");

  return {
    frontmatter: { intent, scope, keywords },
    summary
  };
}
