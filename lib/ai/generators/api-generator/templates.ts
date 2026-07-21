import { ParsedSchema, ParsedProperty } from './parser';
import { ApiGeneratorInput } from './types';

// Helper to generate TS type/interface definitions from properties recursively
export function generateTsInterfaces(schema: ParsedSchema): string {
  let output = `/**\n * Request & Response Types for ${schema.entityName} API Client\n * Generated automatically\n */\n\n`;

  // Root Interface
  output += `export interface ${schema.entityName} {\n`;
  for (const prop of schema.properties) {
    output += `  ${prop.key}: ${prop.typescriptType};\n`;
  }
  output += `}\n\n`;

  // Write nested structures
  const generatedInterfaces = new Set<string>();
  
  function writeNested(props: ParsedProperty[]) {
    for (const prop of props) {
      if (prop.isNested && prop.nestedProperties) {
        const interfaceName = prop.isArray ? (prop.arrayType || '') : prop.typescriptType;
        if (interfaceName && !generatedInterfaces.has(interfaceName) && interfaceName !== 'any') {
          generatedInterfaces.add(interfaceName);
          let subInterface = `export interface ${interfaceName} {\n`;
          for (const subProp of prop.nestedProperties) {
            subInterface += `  ${subProp.key}: ${subProp.typescriptType};\n`;
          }
          subInterface += `}\n\n`;
          output += subInterface;
          writeNested(prop.nestedProperties);
        }
      }
    }
  }

  writeNested(schema.properties);

  // CRUD DTOs
  output += `export interface Create${schema.entityName}Dto {\n`;
  for (const prop of schema.properties) {
    if (prop.key === 'id' || prop.key === 'createdAt' || prop.key === 'updatedAt') {
      continue;
    }
    output += `  ${prop.key}?: ${prop.typescriptType};\n`;
  }
  output += `}\n\n`;

  output += `export interface Update${schema.entityName}Dto extends Partial<Create${schema.entityName}Dto> {}\n`;

  return output.trim();
}

// Generate Axios configuration
export function generateAxiosConfig(isTypeScript: boolean): string {
  const tsPrefix = isTypeScript ? ': AxiosInstance' : '';
  const tsErrorParam = isTypeScript ? ': any' : '';
  const tsPromise = isTypeScript ? ': Promise<never>' : '';
  
  return `import axios${isTypeScript ? ', { AxiosInstance, AxiosResponse }' : ''} from 'axios';
import { API_BASE_URL, TIMEOUT } from './constants';

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const apiClient${tsPrefix} = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor (e.g., adding Authorization tokens)
apiClient.interceptors.request.use(
  (config) => {
    // You can retrieve token from localStorage or cookie here
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = \`Bearer \${token}\`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for standardized error handling
apiClient.interceptors.response.use(
  (response${isTypeScript ? ': AxiosResponse' : ''}) => response.data,
  (error${tsErrorParam})${tsPromise} => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message || error.message || 'An unknown network error occurred';
    
    return Promise.reject(new ApiError(message, status, data));
  }
);

export default apiClient;
`;
}

// Generate Fetch configuration
export function generateFetchConfig(isTypeScript: boolean): string {
  const tsOptions = isTypeScript ? '?: RequestInit' : '';
  const tsPromiseAny = isTypeScript ? ': Promise<T>' : '';
  const tsString = isTypeScript ? ': string' : '';
  
  return `import { API_BASE_URL } from './constants';

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Standardized HTTP fetch client wrapper
 */
export async function request<T = any>(endpoint${tsString}, options${tsOptions})${tsPromiseAny} {
  const url = \`\${API_BASE_URL}\${endpoint}\`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    let responseData: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage = responseData?.message || responseData || response.statusText || 'Fetch request failed';
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network request failed');
  }
}
`;
}

// Generate API functions using Axios
export function generateAxiosApiFunctions(schema: ParsedSchema, isTypeScript: boolean): string {
  let output = `import apiClient from './axios';\n`;
  if (isTypeScript) {
    output += `import { ${schema.entityName}, Create${schema.entityName}Dto, Update${schema.entityName}Dto } from './types';\n\n`;
  } else {
    output += `\n`;
  }

  for (const endpoint of schema.endpoints) {
    const isIdRequired = endpoint.path.includes('/:id');
    const paramSignature = isIdRequired 
      ? `id: string | number${endpoint.requestType ? `, data: ${endpoint.requestType}` : ''}`
      : endpoint.requestType ? `data: ${endpoint.requestType}` : '';

    const jsParamSignature = isIdRequired 
      ? `id${endpoint.requestType ? ', data' : ''}`
      : endpoint.requestType ? 'data' : '';

    const signature = isTypeScript ? paramSignature : jsParamSignature;
    const methodLower = endpoint.method.toLowerCase();
    
    // Path parameter formatting
    const urlString = endpoint.path.includes('/:id')
      ? `\`${endpoint.path.replace('/:id', '/${id}')}\``
      : `'${endpoint.path}'`;

    const returnType = isTypeScript ? `: Promise<${endpoint.responseType}>` : '';

    output += `/**\n * ${endpoint.description}\n */\n`;
    output += `export async function ${endpoint.name}(${signature})${returnType} {\n`;
    
    if (endpoint.method === 'GET' || endpoint.method === 'DELETE') {
      output += `  return apiClient.${methodLower}(${urlString});\n`;
    } else {
      const dataParam = endpoint.requestType ? ', data' : '';
      output += `  return apiClient.${methodLower}(${urlString}${dataParam});\n`;
    }
    output += `}\n\n`;
  }

  return output.trim();
}

// Generate API functions using Fetch
export function generateFetchApiFunctions(schema: ParsedSchema, isTypeScript: boolean): string {
  let output = `import { request } from './fetch';\n`;
  if (isTypeScript) {
    output += `import { ${schema.entityName}, Create${schema.entityName}Dto, Update${schema.entityName}Dto } from './types';\n\n`;
  } else {
    output += `\n`;
  }

  for (const endpoint of schema.endpoints) {
    const isIdRequired = endpoint.path.includes('/:id');
    const paramSignature = isIdRequired 
      ? `id: string | number${endpoint.requestType ? `, data: ${endpoint.requestType}` : ''}`
      : endpoint.requestType ? `data: ${endpoint.requestType}` : '';

    const jsParamSignature = isIdRequired 
      ? `id${endpoint.requestType ? ', data' : ''}`
      : endpoint.requestType ? 'data' : '';

    const signature = isTypeScript ? paramSignature : jsParamSignature;
    const methodUpper = endpoint.method.toUpperCase();
    
    const urlString = endpoint.path.includes('/:id')
      ? `\`${endpoint.path.replace('/:id', '/${id}')}\``
      : `'${endpoint.path}'`;

    const returnType = isTypeScript ? `: Promise<${endpoint.responseType}>` : '';

    output += `/**\n * ${endpoint.description}\n */\n`;
    output += `export async function ${endpoint.name}(${signature})${returnType} {\n`;
    
    output += `  return request<${isTypeScript ? endpoint.responseType : 'any'}>(${urlString}, {\n`;
    output += `    method: '${methodUpper}',\n`;
    if (endpoint.requestType) {
      output += `    body: JSON.stringify(data),\n`;
    }
    output += `  });\n`;
    output += `}\n\n`;
  }

  return output.trim();
}

// Generate React Query Hooks (v4 standard syntax)
export function generateReactQueryHooks(schema: ParsedSchema, isTypeScript: boolean): string {
  let output = `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
  output += `import * as api from './api';\n`;
  if (isTypeScript) {
    output += `import { ${schema.entityName}, Create${schema.entityName}Dto, Update${schema.entityName}Dto } from './types';\n\n`;
  } else {
    output += `\n`;
  }

  const queryKeyBase = `${schema.entityNameCamel.toUpperCase()}_KEYS`;
  output += `export const ${queryKeyBase} = {\n`;
  output += `  all: ['${schema.entityNamePluralCamel}'] as const,\n`;
  output += `  lists: () => [...${queryKeyBase}.all, 'list'] as const,\n`;
  output += `  details: () => [...${queryKeyBase}.all, 'detail'] as const,\n`;
  output += `  detail: (id: string | number) => [...${queryKeyBase}.details(), id] as const,\n};\n\n`;

  // Hooks for each endpoint
  for (const endpoint of schema.endpoints) {
    const isIdRequired = endpoint.path.includes('/:id');
    const isGet = endpoint.method === 'GET';

    if (isGet) {
      if (endpoint.isList) {
        const tsOptions = isTypeScript ? '?: any' : '';
        output += `/**\n * React Query hook for listing ${schema.entityNamePlural}\n */\n`;
        output += `export function use${schema.entityNamePlural}(options${tsOptions}) {\n`;
        output += `  return useQuery(\n`;
        output += `    ${queryKeyBase}.lists(),\n`;
        output += `    () => api.${endpoint.name}(),\n`;
        output += `    options\n`;
        output += `  );\n`;
        output += `}\n\n`;
      } else {
        const tsIdSig = isTypeScript ? 'id: string | number, options?: any' : 'id, options';
        output += `/**\n * React Query hook for retrieving a single ${schema.entityName}\n */\n`;
        output += `export function use${schema.entityName}(${tsIdSig}) {\n`;
        output += `  return useQuery(\n`;
        output += `    ${queryKeyBase}.detail(id),\n`;
        output += `    () => api.${endpoint.name}(id),\n`;
        output += `    {\n`;
        output += `      enabled: !!id,\n`;
        output += `      ...options,\n`;
        output += `    }\n`;
        output += `  );\n`;
        output += `}\n\n`;
      }
    } else {
      // Mutations
      const namePascal = toPascalCase(endpoint.name);
      const isCreate = endpoint.method === 'POST';
      const isDelete = endpoint.method === 'DELETE';

      const tsVariables = isTypeScript 
        ? isCreate ? `Create${schema.entityName}Dto` : isDelete ? 'string | number' : `{ id: string | number; data: Update${schema.entityName}Dto }`
        : '';
      
      const paramSig = isTypeScript ? `<any, Error, ${tsVariables}>` : '';

      output += `/**\n * React Query hook for ${endpoint.description}\n */\n`;
      output += `export function use${namePascal}() {\n`;
      output += `  const queryClient = useQueryClient();\n\n`;
      output += `  return useMutation${paramSig}(\n`;
      if (isCreate) {
        output += `    (data) => api.${endpoint.name}(data),\n`;
      } else if (isDelete) {
        output += `    (id) => api.${endpoint.name}(id),\n`;
      } else {
        output += `    ({ id, data }) => api.${endpoint.name}(id, data),\n`;
      }
      output += `    {\n`;
      output += `      onSuccess: () => {\n`;
      output += `        // Invalidate lists cache to trigger reload\n`;
      output += `        queryClient.invalidateQueries(${queryKeyBase}.lists());\n`;
      output += `      },\n`;
      output += `    }\n`;
      output += `  );\n`;
      output += `}\n\n`;
    }
  }

  return output.trim();
}

// Generate TanStack Query Hooks (v5 syntax with object arguments)
export function generateTanStackQueryHooks(schema: ParsedSchema, isTypeScript: boolean): string {
  let output = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\n`;
  output += `import * as api from './api';\n`;
  if (isTypeScript) {
    output += `import { ${schema.entityName}, Create${schema.entityName}Dto, Update${schema.entityName}Dto } from './types';\n\n`;
  } else {
    output += `\n`;
  }

  const queryKeyBase = `${schema.entityNameCamel.toUpperCase()}_KEYS`;
  output += `export const ${queryKeyBase} = {\n`;
  output += `  all: ['${schema.entityNamePluralCamel}'] as const,\n`;
  output += `  lists: () => [...${queryKeyBase}.all, 'list'] as const,\n`;
  output += `  details: () => [...${queryKeyBase}.all, 'detail'] as const,\n`;
  output += `  detail: (id: string | number) => [...${queryKeyBase}.details(), id] as const,\n};\n\n`;

  // Hooks for each endpoint
  for (const endpoint of schema.endpoints) {
    const isIdRequired = endpoint.path.includes('/:id');
    const isGet = endpoint.method === 'GET';

    if (isGet) {
      if (endpoint.isList) {
        const tsOptions = isTypeScript ? '?: any' : '';
        output += `/**\n * TanStack Query hook for listing ${schema.entityNamePlural}\n */\n`;
        output += `export function use${schema.entityNamePlural}(options${tsOptions}) {\n`;
        output += `  return useQuery({\n`;
        output += `    queryKey: ${queryKeyBase}.lists(),\n`;
        output += `    queryFn: () => api.${endpoint.name}(),\n`;
        output += `    ...options,\n`;
        output += `  });\n`;
        output += `}\n\n`;
      } else {
        const tsIdSig = isTypeScript ? 'id: string | number, options?: any' : 'id, options';
        output += `/**\n * TanStack Query hook for retrieving a single ${schema.entityName}\n */\n`;
        output += `export function use${schema.entityName}(${tsIdSig}) {\n`;
        output += `  return useQuery({\n`;
        output += `    queryKey: ${queryKeyBase}.detail(id),\n`;
        output += `    queryFn: () => api.${endpoint.name}(id),\n`;
        output += `    enabled: !!id,\n`;
        output += `    ...options,\n`;
        output += `  });\n`;
        output += `}\n\n`;
      }
    } else {
      // Mutations
      const namePascal = toPascalCase(endpoint.name);
      const isCreate = endpoint.method === 'POST';
      const isDelete = endpoint.method === 'DELETE';

      const tsVariables = isTypeScript 
        ? isCreate ? `Create${schema.entityName}Dto` : isDelete ? 'string | number' : `{ id: string | number; data: Update${schema.entityName}Dto }`
        : '';
      
      const mutationOptionsSig = isTypeScript ? `<any, Error, ${tsVariables}>` : '';

      output += `/**\n * TanStack Query hook for ${endpoint.description}\n */\n`;
      output += `export function use${namePascal}() {\n`;
      output += `  const queryClient = useQueryClient();\n\n`;
      output += `  return useMutation({\n`;
      if (isCreate) {
        output += `    mutationFn: (data${isTypeScript ? `: Create${schema.entityName}Dto` : ''}) => api.${endpoint.name}(data),\n`;
      } else if (isDelete) {
        output += `    mutationFn: (id${isTypeScript ? `: string | number` : ''}) => api.${endpoint.name}(id),\n`;
      } else {
        output += `    mutationFn: ({ id, data }${isTypeScript ? `: { id: string | number; data: Update${schema.entityName}Dto }` : ''}) => api.${endpoint.name}(id, data),\n`;
      }
      output += `    onSuccess: () => {\n`;
      output += `      queryClient.invalidateQueries({ queryKey: ${queryKeyBase}.lists() });\n`;
      output += `    },\n`;
      output += `  });\n`;
      output += `}\n\n`;
    }
  }

  return output.trim();
}

// Generate constants and configurations
export function generateConstants(basePath: string): string {
  return `/**\n * API Client Configuration Constants\n */\n
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com';

export const TIMEOUT = 15000; // 15 seconds

export const API_ENDPOINTS = {
  base: '${basePath}',
};
`;
}

// Generate README documentation
export function generateReadme(schema: ParsedSchema, input: ApiGeneratorInput): string {
  const clientFile = input.httpClient === 'axios' ? 'axios.ts' : 'fetch.ts';
  const queryLibName = input.queryLibrary === 'react-query' ? 'React Query (v4)' : 'TanStack Query (v5)';
  const fileExt = input.language === 'typescript' ? 'ts' : 'js';

  return `# ${schema.entityName} API Client SDK

Production-ready API client hooks and methods for integrating with the \`${schema.basePath}\` endpoint.

## Project Structure
\`\`\`text
Generated API/
├── ${input.language === 'typescript' ? 'types.ts       # TypeScript Data Models & DTOs\n├── ' : ''}api.${fileExt}         # CRUD API Functions (using ${input.httpClient})
├── ${input.httpClient}.${fileExt}       # API HTTP Client Instance & Config
├── hooks.${fileExt}       # Async State Queries & Mutations (${queryLibName})
├── constants.${fileExt}   # API Constants & Config (Base URL, Timeout)
└── README.md        # SDK Documentation
\`\`\`

## Installation
Ensure you have the required packages installed in your host project:

\`\`\`bash
# Install HTTP client
${input.httpClient === 'axios' ? 'npm install axios' : ''}

# Install Query Library
${input.queryLibrary === 'react-query' ? 'npm install react-query' : 'npm install @tanstack/react-query'}
\`\`\`

## Setup Base URL
Configure the base URL in your environment file (\`.env.local\`):
\`\`\`env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
\`\`\`

## Usage Example

### 1. Configure the Provider
Ensure you wrap your app in the Query Provider:

\`\`\`tsx
import { QueryClient, QueryClientProvider } from '${input.queryLibrary === 'react-query' ? 'react-query' : '@tanstack/react-query'}';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourDashboard />
    </QueryClientProvider>
  );
}
\`\`\`

### 2. Consuming Hooks in React Component
\`\`\`tsx
import React from 'react';
import { use${schema.entityNamePlural}, useCreate${schema.entityName} } from './hooks';

export function ${schema.entityName}Dashboard() {
  // Query
  const { data: ${schema.entityNamePluralCamel}, isLoading, error } = use${schema.entityNamePlural}();

  // Mutation
  const createMutation = useCreate${schema.entityName}();

  const handleAdd = () => {
    createMutation.mutate({
      // fields
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error fetching: {error.message}</div>;

  return (
    <div>
      <h1>${schema.entityName} Management</h1>
      <button onClick={handleAdd} disabled={createMutation.isLoading}>
        Add ${schema.entityName}
      </button>
      <ul>
        {${schema.entityNamePluralCamel}?.map(item => (
          <li key={item.id}>{item.name || 'Untitled Item'}</li>
        ))}
      </ul>
    </div>
  );
}
\`\`\`
`;
}

function toPascalCase(str: string): string {
  return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
            .replace(/^[^a-zA-Z0-9]+/, '')
            .replace(/^\w/, c => c.toUpperCase());
}
