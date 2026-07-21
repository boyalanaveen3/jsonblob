export type JsonAction = 'explain' | 'validate' | 'fix' | 'beautify' | 'minify' | 'schema' | 'mock' | 'flatten' | 'unflatten' | 'compare' | 'merge' | 'unknown';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function detectJsonAction(prompt: string): JsonAction {
  const normalized = prompt.toLowerCase();

  if (/(schema|draft|json schema)/.test(normalized)) return 'schema';
  if (/(mock|sample data|generate mock)/.test(normalized)) return 'mock';
  if (/(unflatten|expand)/.test(normalized)) return 'unflatten';
  if (/(flatten|flattened)/.test(normalized)) return 'flatten';
  if (/(compare|diff)/.test(normalized)) return 'compare';
  if (/(merge)/.test(normalized)) return 'merge';
  if (/(minify|compact)/.test(normalized)) return 'minify';
  if (/(beautify|pretty|format|clean)/.test(normalized)) return 'beautify';
  if (/(fix|repair|resolve|correct)/.test(normalized)) return 'fix';
  if (/(validate|check|syntax issues|syntax check|report syntax|structural issues)/.test(normalized)) return 'validate';
  if (/(explain|summarize)/.test(normalized)) return 'explain';
  return 'unknown';
}

export function generateJsonSchema(value: unknown) {
  const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  const schema: Record<string, unknown> = { type };

  if (Array.isArray(value)) {
    schema.items = value.length > 0 ? generateJsonSchema(value[0]) : { type: 'object' };
  } else if (value && typeof value === 'object') {
    schema.properties = Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, generateJsonSchema(val)])
    );
    schema.required = Object.keys(value);
  }

  return schema;
}

export function flattenJson(value: unknown, prefix = ''): Record<string, unknown> {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, unknown>>((acc, item, index) => ({ ...acc, ...flattenJson(item, `${prefix}${prefix ? '.' : ''}${index}`) }), {});
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nested]) => ({
      ...acc,
      ...flattenJson(nested, `${prefix}${prefix ? '.' : ''}${key}`),
    }), {});
  }

  return prefix ? { [prefix]: value } : {};
}

export function unflattenJson(flat: Record<string, unknown>): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let target: Record<string, unknown> = root;
    parts.slice(0, -1).forEach((part) => {
      if (!target[part] || typeof target[part] !== 'object' || Array.isArray(target[part])) {
        target[part] = {};
      }
      target = target[part] as Record<string, unknown>;
    });
    target[parts[parts.length - 1]] = value;
  }

  return root;
}

export function compareJson(left: unknown, right: unknown): string {
  const leftText = JSON.stringify(left, null, 2);
  const rightText = JSON.stringify(right, null, 2);
  return `Left:\n${leftText}\n\nRight:\n${rightText}`;
}

export function mergeJson(left: unknown, right: unknown): unknown {
  if (isPlainObject(left) && isPlainObject(right)) {
    return { ...left, ...right };
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return [...left, ...right];
  }

  return right ?? left;
}
