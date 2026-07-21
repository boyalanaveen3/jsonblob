import { ApiGenerator, ApiGeneratorInput, GeneratedFile } from './types';
import { parseInput } from './parser';
import * as templates from './templates';

export class JavaScriptGenerator implements ApiGenerator {
  generate(input: ApiGeneratorInput): GeneratedFile[] {
    const schema = parseInput(input.inputType, input.inputVal, input.entityName);
    const files: GeneratedFile[] = [];

    // JavaScript does not use a types.js file since JS is dynamically typed.

    // 1. HTTP Client Configuration & api.js
    if (input.httpClient === 'axios') {
      files.push({
        name: 'axios.js',
        content: templates.generateAxiosConfig(false),
        language: 'javascript'
      });
      files.push({
        name: 'api.js',
        content: templates.generateAxiosApiFunctions(schema, false),
        language: 'javascript'
      });
    } else {
      files.push({
        name: 'fetch.js',
        content: templates.generateFetchConfig(false),
        language: 'javascript'
      });
      files.push({
        name: 'api.js',
        content: templates.generateFetchApiFunctions(schema, false),
        language: 'javascript'
      });
    }

    // 2. Query hooks (hooks.js)
    const hooksContent = input.queryLibrary === 'react-query'
      ? templates.generateReactQueryHooks(schema, false)
      : templates.generateTanStackQueryHooks(schema, false);

    files.push({
      name: 'hooks.js',
      content: hooksContent,
      language: 'javascript'
    });

    // 3. constants.js
    files.push({
      name: 'constants.js',
      content: templates.generateConstants(schema.basePath),
      language: 'javascript'
    });

    // 4. README.md
    files.push({
      name: 'README.md',
      content: templates.generateReadme(schema, input),
      language: 'markdown'
    });

    return files;
  }
}
