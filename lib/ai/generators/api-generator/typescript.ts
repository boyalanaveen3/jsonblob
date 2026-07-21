import { ApiGenerator, ApiGeneratorInput, GeneratedFile } from './types';
import { parseInput } from './parser';
import * as templates from './templates';

export class TypeScriptGenerator implements ApiGenerator {
  generate(input: ApiGeneratorInput): GeneratedFile[] {
    const schema = parseInput(input.inputType, input.inputVal, input.entityName);
    const files: GeneratedFile[] = [];

    // 1. types.ts
    files.push({
      name: 'types.ts',
      content: templates.generateTsInterfaces(schema),
      language: 'typescript'
    });

    // 2. HTTP Client Configuration & api.ts
    if (input.httpClient === 'axios') {
      files.push({
        name: 'axios.ts',
        content: templates.generateAxiosConfig(true),
        language: 'typescript'
      });
      files.push({
        name: 'api.ts',
        content: templates.generateAxiosApiFunctions(schema, true),
        language: 'typescript'
      });
    } else {
      files.push({
        name: 'fetch.ts',
        content: templates.generateFetchConfig(true),
        language: 'typescript'
      });
      files.push({
        name: 'api.ts',
        content: templates.generateFetchApiFunctions(schema, true),
        language: 'typescript'
      });
    }

    // 3. Query hooks (hooks.ts)
    const hooksContent = input.queryLibrary === 'react-query'
      ? templates.generateReactQueryHooks(schema, true)
      : templates.generateTanStackQueryHooks(schema, true);

    files.push({
      name: 'hooks.ts',
      content: hooksContent,
      language: 'typescript'
    });

    // 4. constants.ts
    files.push({
      name: 'constants.ts',
      content: templates.generateConstants(schema.basePath),
      language: 'typescript'
    });

    // 5. README.md
    files.push({
      name: 'README.md',
      content: templates.generateReadme(schema, input),
      language: 'markdown'
    });

    return files;
  }
}
