export interface ParsedProperty {
  key: string;
  type: string;
  typescriptType: string;
  javascriptType: string;
  description?: string;
  isNested: boolean;
  nestedProperties?: ParsedProperty[];
  isArray: boolean;
  arrayType?: string;
}

export interface ParsedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  name: string;
  description: string;
  requestType?: string;
  responseType: string;
  isList: boolean;
}

export interface ParsedSchema {
  entityName: string;
  entityNameCamel: string;
  entityNamePlural: string;
  entityNamePluralCamel: string;
  properties: ParsedProperty[];
  endpoints: ParsedEndpoint[];
  basePath: string;
}

function toCamelCase(str: string): string {
  return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
            .replace(/^[^a-zA-Z0-9]+/, '');
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  if (!camel) return '';
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function singularize(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith('people')) return word.slice(0, -6) + 'Person';
  if (w.endsWith('children')) return word.slice(0, -8) + 'Child';
  if (w.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (w.endsWith('es') && (w.endsWith('passes') || w.endsWith('statuses') || w.endsWith('categories') || w.endsWith('boxes'))) {
    if (w.endsWith('categories')) return word.slice(0, -5) + 'y';
    return word.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) {
    return word.slice(0, -1);
  }
  return word;
}

function pluralize(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith('person')) return word.slice(0, -6) + 'people';
  if (w.endsWith('child')) return word.slice(0, -5) + 'children';
  if (w.endsWith('y') && !['a','e','i','o','u'].includes(w.charAt(w.length - 2))) {
    return word.slice(0, -1) + 'ies';
  }
  if (w.endsWith('s') || w.endsWith('ch') || w.endsWith('sh') || w.endsWith('x') || w.endsWith('z')) {
    return word + 'es';
  }
  return word + 's';
}

function inferType(value: any): { type: string; tsType: string; jsType: string } {
  if (value === null) {
    return { type: 'null', tsType: 'any', jsType: 'any' };
  }
  const t = typeof value;
  if (t === 'string') {
    return { type: 'string', tsType: 'string', jsType: 'string' };
  }
  if (t === 'number') {
    return { type: 'number', tsType: 'number', jsType: 'number' };
  }
  if (t === 'boolean') {
    return { type: 'boolean', tsType: 'boolean', jsType: 'boolean' };
  }
  if (Array.isArray(value)) {
    return { type: 'array', tsType: 'any[]', jsType: 'array' };
  }
  if (t === 'object') {
    return { type: 'object', tsType: 'object', jsType: 'object' };
  }
  return { type: 'any', tsType: 'any', jsType: 'any' };
}

function parseJsonToProperties(obj: any): ParsedProperty[] {
  if (!obj || typeof obj !== 'object') return [];
  const props: ParsedProperty[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const { type, tsType, jsType } = inferType(val);
    const isArray = Array.isArray(val);
    
    let arrayType = undefined;
    let nestedProperties: ParsedProperty[] = [];
    let isNested = false;

    if (isArray && val.length > 0) {
      const firstItem = val[0];
      const itemInfo = inferType(firstItem);
      if (itemInfo.type === 'object' && firstItem !== null) {
        arrayType = toPascalCase(key) + 'Item';
        nestedProperties = parseJsonToProperties(firstItem);
        isNested = true;
      } else {
        arrayType = itemInfo.tsType;
      }
    } else if (type === 'object' && val !== null) {
      nestedProperties = parseJsonToProperties(val);
      isNested = true;
    }

    props.push({
      key,
      type,
      typescriptType: isArray ? (arrayType === 'anyItem' || !arrayType ? 'any[]' : `${arrayType}[]`) : (isNested ? toPascalCase(key) : tsType),
      javascriptType: jsType,
      isNested,
      nestedProperties: nestedProperties.length > 0 ? nestedProperties : undefined,
      isArray,
      arrayType
    });
  }
  return props;
}

export function inferEntityNameFromJson(targetObj: any, parsedRoot?: any): string {
  if (!targetObj || typeof targetObj !== 'object') return 'Entity';

  // 0. Check if targetObj or parsedRoot is OpenAPI / Swagger JSON spec
  const root = parsedRoot || targetObj;
  if (root && typeof root === 'object') {
    if (root.swagger || root.openapi || (root.paths && root.info)) {
      if (root.info?.title && typeof root.info.title === 'string' && root.info.title.toLowerCase() !== 'sample api') {
        const titleWords = root.info.title.replace(/api|service|sdk|v\d+/gi, '').trim();
        if (titleWords) {
          return toPascalCase(singularize(titleWords));
        }
      }
      if (root.paths && typeof root.paths === 'object') {
        const pathKeys = Object.keys(root.paths);
        for (const p of pathKeys) {
          const segs = p.split('/').filter(Boolean).filter(s => !s.startsWith(':') && !s.startsWith('{') && !['api', 'v1', 'v2', 'v3', 'rest'].includes(s.toLowerCase()));
          if (segs.length > 0) {
            return toPascalCase(singularize(segs[0]));
          }
        }
      }
    }
  }

  // Auto-unwrap envelope object if present
  let actualObj = targetObj;
  if (actualObj.data && typeof actualObj.data === 'object' && !Array.isArray(actualObj.data)) {
    actualObj = actualObj.data;
  } else if (actualObj.payload && typeof actualObj.payload === 'object' && !Array.isArray(actualObj.payload)) {
    actualObj = actualObj.payload;
  } else if (actualObj.result && typeof actualObj.result === 'object' && !Array.isArray(actualObj.result)) {
    actualObj = actualObj.result;
  }

  // Check if actualObj has container keys e.g. services, products, items, employees
  const actualKeys = Object.keys(actualObj);
  for (const key of actualKeys) {
    if (!['status', 'message', 'code', 'success', 'page', 'total', 'count'].includes(key.toLowerCase())) {
      const val = actualObj[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return toPascalCase(singularize(key));
      }
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        // e.g. services: { Telemedicine: { ... } }
        return toPascalCase(singularize(key));
      }
    }
  }

  // 1. Check root object for container array keys e.g. { "employees": [...] } or { "data": [...] }
  if (parsedRoot && typeof parsedRoot === 'object' && !Array.isArray(parsedRoot)) {
    const rootKeys = Object.keys(parsedRoot);
    for (const key of rootKeys) {
      if (Array.isArray(parsedRoot[key]) && !['data', 'items', 'results', 'services', 'payload'].includes(key.toLowerCase())) {
        return toPascalCase(singularize(key));
      }
    }
  }

  // 2. Check keys ending in Id or _id e.g. employeeId -> Employee
  for (const k of actualKeys) {
    const lower = k.toLowerCase();
    if (lower !== 'id' && (k.endsWith('Id') || k.endsWith('_id'))) {
      const prefix = k.endsWith('Id') ? k.slice(0, -2) : k.slice(0, -3);
      if (prefix.trim()) {
        return toPascalCase(singularize(prefix));
      }
    }
  }

  // 3. Check keys ending in Name or _name e.g. employeeName -> Employee
  for (const k of actualKeys) {
    if (k.endsWith('Name') || k.endsWith('_name')) {
      const prefix = k.endsWith('Name') ? k.slice(0, -4) : k.slice(0, -5);
      if (prefix.trim() && !['first', 'last', 'full', 'package'].includes(prefix.toLowerCase())) {
        return toPascalCase(singularize(prefix));
      }
    }
  }

  // 4. Check explicit fields like type, role, kind, entity, model
  if (actualObj.type && typeof actualObj.type === 'string') return toPascalCase(actualObj.type);
  if (actualObj.kind && typeof actualObj.kind === 'string') return toPascalCase(actualObj.kind);
  if (actualObj.model && typeof actualObj.model === 'string') return toPascalCase(actualObj.model);
  if (actualObj.role && typeof actualObj.role === 'string') return toPascalCase(actualObj.role);

  // 5. Semantic field heuristics
  const keySet = new Set(actualKeys.map(k => k.toLowerCase()));
  if (keySet.has('email') || keySet.has('username') || keySet.has('avatar')) {
    return keySet.has('salary') || keySet.has('department') || keySet.has('jobtitle') ? 'Employee' : 'User';
  }
  if (keySet.has('price') || keySet.has('sku') || keySet.has('stock') || keySet.has('inventory')) {
    return 'Product';
  }
  if (keySet.has('total') || keySet.has('orderdate')) {
    return 'Order';
  }
  if (keySet.has('content') || keySet.has('json') || keySet.has('blob')) {
    return 'Blob';
  }
  if (keySet.has('code') || keySet.has('snippet') || keySet.has('language')) {
    return 'Snippet';
  }

  // 6. First non-generic key
  for (const k of actualKeys) {
    if (!['id', 'createdat', 'updatedat', 'v', '_id', 'status', 'type', 'name', 'message', 'data', 'totals', 'productcount'].includes(k.toLowerCase())) {
      return toPascalCase(singularize(k));
    }
  }

  return 'Entity';
}

function unwrapTargetObject(parsed: any): { targetObj: any; suggestedEntityName?: string } {
  if (!parsed || typeof parsed !== 'object') return { targetObj: parsed };

  let curr = parsed;
  let suggestedEntityName: string | undefined = undefined;

  if (Array.isArray(curr)) {
    curr = curr.length > 0 ? curr[0] : {};
  }

  // Unwrap envelope e.g. { status, message, data: { ... } }
  if (curr.data && typeof curr.data === 'object' && !Array.isArray(curr.data)) {
    curr = curr.data;
  } else if (curr.payload && typeof curr.payload === 'object' && !Array.isArray(curr.payload)) {
    curr = curr.payload;
  } else if (curr.result && typeof curr.result === 'object' && !Array.isArray(curr.result)) {
    curr = curr.result;
  }

  // Look for services/items/products container objects
  if (curr && typeof curr === 'object') {
    for (const key of Object.keys(curr)) {
      const val = curr[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        suggestedEntityName = toPascalCase(singularize(key));
        return { targetObj: val[0], suggestedEntityName };
      }
      if (val && typeof val === 'object' && !Array.isArray(val) && key.toLowerCase() !== 'totals') {
        const subKeys = Object.keys(val);
        if (subKeys.length > 0 && typeof val[subKeys[0]] === 'object') {
          suggestedEntityName = toPascalCase(singularize(key)); // e.g. services -> Service
          // Find item with actual numeric/string metrics (e.g. Telemedicine)
          const firstSubObj = val[subKeys[0]];
          // Check if firstSubObj has nested channel properties or metrics
          const metricKey = Object.keys(firstSubObj).find(k => typeof firstSubObj[k] === 'object' && firstSubObj[k] !== null && 'search' in firstSubObj[k]) || subKeys[0];
          const innerSample = typeof firstSubObj[metricKey] === 'object' && firstSubObj[metricKey] !== null ? firstSubObj[metricKey] : firstSubObj;
          return { targetObj: innerSample, suggestedEntityName };
        }
        suggestedEntityName = toPascalCase(singularize(key));
        return { targetObj: val, suggestedEntityName };
      }
    }
  }

  return { targetObj: curr, suggestedEntityName };
}

export function simpleYamlToJson(yamlStr: string): any {
  try {
    const lines = yamlStr.split('\n');
    const root: any = {};
    const stack: { indent: number; obj: any }[] = [{ indent: -1, obj: root }];

    for (let line of lines) {
      line = line.replace(/#.*$/, '');
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      const trimmed = line.trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;

      if (trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':');
        let key = trimmed.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
        let val = trimmed.slice(colonIdx + 1).trim();

        if (val === '' || val === '>' || val === '|') {
          const newObj: any = {};
          parent[key] = newObj;
          stack.push({ indent, obj: newObj });
        } else {
          val = val.replace(/^['"]|['"]$/g, '');
          let parsedVal: any = val;
          if (val === 'true') parsedVal = true;
          else if (val === 'false') parsedVal = false;
          else if (!isNaN(Number(val)) && val !== '') parsedVal = Number(val);

          parent[key] = parsedVal;
        }
      }
    }

    return root;
  } catch (e) {
    return null;
  }
}

export function parseInput(
  inputType: 'json' | 'rest' | 'openapi',
  inputVal: string,
  userEntityName?: string
): ParsedSchema {
  let entityName = userEntityName ? toPascalCase(userEntityName) : 'Entity';
  let properties: ParsedProperty[] = [];
  let endpoints: ParsedEndpoint[] = [];
  let basePath = '/api';

  // Check if JSON or YAML input is actually an OpenAPI/Swagger document
  let parsedJsonDoc: any = null;
  try {
    parsedJsonDoc = JSON.parse(inputVal);
  } catch (e) {
    // Attempt YAML parsing if string contains swagger or openapi or paths
    if (inputVal.includes('swagger:') || inputVal.includes('openapi:') || inputVal.includes('paths:')) {
      parsedJsonDoc = simpleYamlToJson(inputVal);
    }
  }

  if (parsedJsonDoc && typeof parsedJsonDoc === 'object' && (parsedJsonDoc.swagger || parsedJsonDoc.openapi || (parsedJsonDoc.paths && parsedJsonDoc.info))) {
    inputType = 'openapi';
  }

  if (inputType === 'json') {
    let parsed: any = parsedJsonDoc;
    if (!parsed) {
      try {
        parsed = JSON.parse(inputVal);
      } catch (e) {
        try {
          const cleaned = inputVal
            .replace(/'/g, '"')
            .replace(/,\s*([\]}])/g, "$1")
            .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          parsed = JSON.parse(cleaned);
        } catch (innerError) {
          parsed = { id: 1, name: 'Default Entity', status: 'active' };
        }
      }
    }

    const { targetObj, suggestedEntityName } = unwrapTargetObject(parsed);
    properties = parseJsonToProperties(targetObj);
    
    // Attempt to guess entityName from JSON keys dynamically
    if (!userEntityName) {
      entityName = suggestedEntityName || inferEntityNameFromJson(targetObj, parsed);
    }

    const pathPart = toCamelCase(pluralize(entityName)).toLowerCase();
    basePath = `/api/${pathPart}`;

  } else if (inputType === 'rest') {
    // Expected format: METHOD /path (e.g. GET /api/employees or POST /v1/products)
    const lines = inputVal.split('\n').map(l => l.trim()).filter(Boolean);
    let parsedEndpoints = false;

    for (const line of lines) {
      const match = line.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
      if (match) {
        const method = match[1].toUpperCase() as any;
        const path = match[2];
        
        // Try to infer base path and entity name from first valid endpoint
        if (!parsedEndpoints) {
          const pathSegments = path.split('/').filter(Boolean);
          let candidate = 'item';
          if (pathSegments.length > 0) {
            let last = pathSegments[pathSegments.length - 1];
            if ((last.startsWith(':') || last.startsWith('{')) && pathSegments.length > 1) {
              candidate = pathSegments[pathSegments.length - 2];
            } else {
              candidate = last;
            }
          }
          if (!userEntityName) {
            entityName = toPascalCase(singularize(candidate));
          }
          
          const baseSegments = pathSegments.filter(s => !s.startsWith(':') && !s.startsWith('{'));
          basePath = '/' + baseSegments.join('/');
          parsedEndpoints = true;
        }

        const isList = method === 'GET' && !path.includes(':') && !path.includes('{');
        const namePascal = toPascalCase(entityName);

        let endpointName = '';
        let responseType = '';
        let requestType = undefined;

        if (method === 'GET') {
          endpointName = isList ? `get${pluralize(namePascal)}` : `get${namePascal}`;
          responseType = isList ? `${namePascal}[]` : namePascal;
        } else if (method === 'POST') {
          endpointName = `create${namePascal}`;
          requestType = `Create${namePascal}Dto`;
          responseType = namePascal;
        } else if (method === 'PUT') {
          endpointName = `update${namePascal}`;
          requestType = `Update${namePascal}Dto`;
          responseType = namePascal;
        } else if (method === 'PATCH') {
          endpointName = `patch${namePascal}`;
          requestType = `Partial<Create${namePascal}Dto>`;
          responseType = namePascal;
        } else if (method === 'DELETE') {
          endpointName = `delete${namePascal}`;
          responseType = 'void';
        }

        endpoints.push({
          method,
          path,
          name: endpointName,
          description: `${method} handler for ${path}`,
          requestType,
          responseType,
          isList
        });
      }
    }

    if (endpoints.length === 0) {
      const namePascal = toPascalCase(entityName);
      endpoints = getDefaultEndpoints(namePascal, basePath);
    }
    properties = [{ key: 'id', type: 'number', typescriptType: 'number', javascriptType: 'number', isNested: false, isArray: false }];

  } else if (inputType === 'openapi') {
    // Parse OpenAPI Swagger Spec JSON
    try {
      const spec = parsedJsonDoc || JSON.parse(inputVal);
      if (!userEntityName) {
        entityName = inferEntityNameFromJson(spec, spec);
      }

      if (spec.paths && typeof spec.paths === 'object') {
        const paths = Object.keys(spec.paths);
        if (paths.length > 0) {
          basePath = spec.servers?.[0]?.url || '/api';
          
          for (const path of paths) {
            const methods = Object.keys(spec.paths[path]);
            for (const method of methods) {
              const upperMethod = method.toUpperCase();
              if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod)) {
                // Determine entity name for specific endpoint path
                const segments = path.split('/').filter(Boolean).filter(s => !s.startsWith(':') && !s.startsWith('{') && !['api', 'v1', 'v2', 'rest'].includes(s.toLowerCase()));
                const pathEntity = segments.length > 0 ? toPascalCase(singularize(segments[0])) : entityName;
                const pathEntityPascal = toPascalCase(pathEntity);
                
                const isList = upperMethod === 'GET' && !path.includes(':') && !path.includes('{');
                
                let endpointName = '';
                if (upperMethod === 'GET') {
                  endpointName = isList ? `get${pluralize(pathEntityPascal)}` : `get${pathEntityPascal}`;
                } else if (upperMethod === 'POST') {
                  endpointName = `create${pathEntityPascal}`;
                } else if (upperMethod === 'PUT') {
                  endpointName = `update${pathEntityPascal}`;
                } else if (upperMethod === 'DELETE') {
                  endpointName = `delete${pathEntityPascal}`;
                } else {
                  endpointName = `${upperMethod.toLowerCase()}${pathEntityPascal}`;
                }

                endpoints.push({
                  method: upperMethod as any,
                  path: path.replace(/{/g, ':').replace(/}/g, ''),
                  name: endpointName,
                  description: spec.paths[path][method].summary || `${upperMethod} handler for ${path}`,
                  requestType: ['POST', 'PUT', 'PATCH'].includes(upperMethod) ? `Create${pathEntityPascal}Dto` : undefined,
                  responseType: isList ? `${pathEntityPascal}[]` : pathEntityPascal,
                  isList
                });
              }
            }
          }
        }
      }

      // Try extracting properties from definitions or schemas
      const schemas = spec.definitions || spec.components?.schemas || {};
      const schemaKeys = Object.keys(schemas);
      let foundSchemaObj: any = null;
      if (schemaKeys.length > 0) {
        // Find matching schema or first schema
        const matchKey = schemaKeys.find(k => k.toLowerCase() === entityName.toLowerCase()) || schemaKeys[0];
        const schemaDef = schemas[matchKey];
        if (schemaDef && schemaDef.properties) {
          foundSchemaObj = {};
          for (const [propName, propDef] of Object.entries<any>(schemaDef.properties)) {
            foundSchemaObj[propName] = propDef.example ?? (propDef.type === 'number' || propDef.type === 'integer' ? 1 : propDef.type === 'boolean' ? true : propDef.type === 'array' ? [] : propDef.type === 'object' ? {} : 'sample');
          }
        }
      }
      if (foundSchemaObj) {
        properties = parseJsonToProperties(foundSchemaObj);
      }
    } catch (e) {
      // Fallback
    }

    if (endpoints.length === 0) {
      const namePascal = toPascalCase(entityName);
      endpoints = getDefaultEndpoints(namePascal, basePath);
    }
    if (properties.length === 0) {
      properties = [
        { key: 'id', type: 'number', typescriptType: 'number', javascriptType: 'number', isNested: false, isArray: false },
        { key: 'name', type: 'string', typescriptType: 'string', javascriptType: 'string', isNested: false, isArray: false },
        { key: 'status', type: 'string', typescriptType: 'string', javascriptType: 'string', isNested: false, isArray: false }
      ];
    }
  }

  // Populate default CRUD endpoints if we generated from JSON or OpenAPI had none
  if (endpoints.length === 0) {
    const namePascal = toPascalCase(entityName);
    endpoints = getDefaultEndpoints(namePascal, basePath);
  }

  return {
    entityName,
    entityNameCamel: toCamelCase(entityName),
    entityNamePlural: pluralize(entityName),
    entityNamePluralCamel: toCamelCase(pluralize(entityName)),
    properties,
    endpoints,
    basePath
  };
}

function getDefaultEndpoints(entityNamePascal: string, basePath: string): ParsedEndpoint[] {
  return [
    {
      method: 'GET',
      path: basePath,
      name: `get${pluralize(entityNamePascal)}`,
      description: `Retrieve list of ${pluralize(entityNamePascal)}`,
      responseType: `${entityNamePascal}[]`,
      isList: true
    },
    {
      method: 'GET',
      path: `${basePath}/:id`,
      name: `get${entityNamePascal}ById`,
      description: `Retrieve a single ${entityNamePascal} by ID`,
      responseType: entityNamePascal,
      isList: false
    },
    {
      method: 'POST',
      path: basePath,
      name: `create${entityNamePascal}`,
      description: `Create a new ${entityNamePascal}`,
      requestType: `Create${entityNamePascal}Dto`,
      responseType: entityNamePascal,
      isList: false
    },
    {
      method: 'PUT',
      path: `${basePath}/:id`,
      name: `update${entityNamePascal}`,
      description: `Update an existing ${entityNamePascal}`,
      requestType: `Update${entityNamePascal}Dto`,
      responseType: entityNamePascal,
      isList: false
    },
    {
      method: 'DELETE',
      path: `${basePath}/:id`,
      name: `delete${entityNamePascal}`,
      description: `Delete a ${entityNamePascal} by ID`,
      responseType: 'void',
      isList: false
    }
  ];
}
