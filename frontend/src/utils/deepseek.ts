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

  // Calculate target summary length (words)
  // Formula: input word count / 5, minimum 20 words for short texts
  const wordCount = truncatedText.trim().split(/\s+/).length;
  const targetWords = Math.max(20, Math.floor(wordCount / 5));
  
  // Set max_tokens with 3x buffer to prevent cutoff
  // AI sometimes adds extra notes/formatting, need generous buffer
  const maxTokensBuffer = Math.max(80, Math.floor(targetWords * 3));

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
            content: "You are a helpful assistant that creates concise summaries. Provide ONLY the summary paragraph without any additional notes, explanations, or meta-commentary. No markdown formatting, bullet points, or special characters."
          },
          {
            role: "user",
            content: `Provide a concise summary in approximately ${targetWords} words. Write ONLY one complete paragraph capturing the key information. Do not add any notes, explanations, or additional commentary after the summary:\n\n${truncatedText}`
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokensBuffer,
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

