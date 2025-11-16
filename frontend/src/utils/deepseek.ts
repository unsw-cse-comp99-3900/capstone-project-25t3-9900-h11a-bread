/**
 * DeepSeek API Integration for Text Summarization
 * Uses SiliconFlow API for DeepSeek model access
 */

export async function summarizeText(text: string): Promise<string> {
  const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
  const DEEPSEEK_API_URL = "https://api.siliconflow.cn/v1/chat/completions"; // SiliconFlow endpoint
  
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key not configured. Please add VITE_DEEPSEEK_API_KEY to your .env file.");
  }

  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error("No text provided for summarization.");
  }

  // Limit text length to avoid API issues (approx 3000 words)
  const maxLength = 12000;
  const truncatedText = text.length > maxLength 
    ? text.substring(0, maxLength) + "\n\n[Text truncated due to length...]"
    : text;

  // Calculate dynamic max_tokens based on word count
  // Formula: total word count / 3 to allow complete sentences
  // Minimum 50 tokens ensures summary is not cut off mid-sentence
  const wordCount = truncatedText.trim().split(/\s+/).length;
  const dynamicMaxTokens = Math.max(50, Math.floor(wordCount / 3));

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3", // SiliconFlow model name
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates concise summaries. Always provide summaries as a single coherent paragraph without any markdown formatting, bullet points, or special characters."
          },
          {
            role: "user",
            content: `Please provide a concise summary of the following transcript in one paragraph. Focus on the key information and main topics discussed. Write in plain text without any markdown syntax, bullet points, asterisks, or special formatting:\n\n${truncatedText}`
          }
        ],
        temperature: 0.7,
        max_tokens: dynamicMaxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No summary generated.";
  } catch (error) {
    console.error("DeepSeek API summarization error:", error);
    throw error;
  }
}

