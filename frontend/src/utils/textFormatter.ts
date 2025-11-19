export function formatPunctuationSpacing(text: string): string {
  if (!text) return "";

  let formatted = text;

  // Remove spaces before punctuation marks
  formatted = formatted.replace(/\s+([.,!?:;)\]])/g, "$1");

  // Ensure single space after sentence-ending and clause punctuation
  // (but don't add space if it's at the end of the string)
  formatted = formatted.replace(/([.,!?:;])(?=\S)/g, "$1 ");

  // Remove spaces after opening brackets/parentheses
  formatted = formatted.replace(/([\(\[])\s+/g, "$1");

  // Handle quotation marks, remove space after opening quotes
  formatted = formatted.replace(/"\s+/g, '"');
  formatted = formatted.replace(/'\s+(?=\w)/g, "'");

  // Remove space before closing quotes
  formatted = formatted.replace(/\s+"/g, '"');
  formatted = formatted.replace(/(?<=\w)\s+'/g, "'");

  // Collapse multiple spaces into single space
  formatted = formatted.replace(/\s+/g, " ");
  formatted = formatted.trim();
  return formatted;
}
