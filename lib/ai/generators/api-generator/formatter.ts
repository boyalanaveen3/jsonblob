/**
 * Basic formatting utility to keep generated code clean and structured
 */
export function formatCode(code: string, language: string): string {
  if (language !== 'typescript' && language !== 'javascript') {
    return code;
  }

  // 1. Trim trailing whitespace on all lines
  let lines = code.split('\n').map(line => line.trimEnd());

  // 2. Join back and collapse multi-line breaks (limit to max 2 consecutive newlines)
  let formatted = lines.join('\n');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // 3. Ensure single trailing newline
  formatted = formatted.trim() + '\n';

  return formatted;
}
