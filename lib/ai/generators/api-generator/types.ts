export interface ApiGeneratorInput {
  inputType: 'json' | 'rest' | 'openapi';
  inputVal: string;
  language: 'typescript' | 'javascript';
  httpClient: 'axios' | 'fetch';
  queryLibrary: 'react-query' | 'tanstack-query';
  entityName?: string; // Optional user override for entity name, e.g., "Employee"
}

export interface GeneratedFile {
  name: string;
  content: string;
  language: string; // for syntax highlighting
}

export interface ApiGenerator {
  generate(input: ApiGeneratorInput): GeneratedFile[];
}

// Future capabilities placeholders (interfaces/types)
export interface ZodSchemaGenerator {
  generateZodSchema(input: ApiGeneratorInput): string;
}

export interface YupSchemaGenerator {
  generateYupSchema(input: ApiGeneratorInput): string;
}

export interface MockDataGenerator {
  generateMockData(input: ApiGeneratorInput): string;
}

export interface UnitTestGenerator {
  generateUnitTests(input: ApiGeneratorInput, targetFile: GeneratedFile): string;
}

export interface PostmanCollectionGenerator {
  generatePostmanCollection(input: ApiGeneratorInput): string;
}

export interface SwaggerDocGenerator {
  generateSwaggerDoc(input: ApiGeneratorInput): string;
}

export interface SdkGenerator {
  generateSdk(input: ApiGeneratorInput): GeneratedFile[];
}

export interface ApiDocGenerator {
  generateApiDoc(input: ApiGeneratorInput): string;
}
