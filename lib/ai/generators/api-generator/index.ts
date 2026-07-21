import { ApiGeneratorInput, GeneratedFile } from './types';
import { TypeScriptGenerator } from './typescript';
import { JavaScriptGenerator } from './javascript';
import { formatCode } from './formatter';

export * from './types';
export * from './parser';
export * from './templates';
export * from './typescript';
export * from './javascript';
export * from './formatter';

/**
 * Standard entry point for client generation.
 * Distributes execution to the respective TypeScript or JavaScript generators
 * and formats the outputs before returning.
 */
export function generateApiClient(input: ApiGeneratorInput): GeneratedFile[] {
  const generator = input.language === 'typescript'
    ? new TypeScriptGenerator()
    : new JavaScriptGenerator();

  const rawFiles = generator.generate(input);

  return rawFiles.map(file => ({
    name: file.name,
    content: formatCode(file.content, file.language),
    language: file.language,
  }));
}
