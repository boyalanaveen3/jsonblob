import assert from 'node:assert/strict';
import { detectJsonAction, generateJsonSchema, flattenJson, unflattenJson } from '../lib/ai/assistantUtils.js';

const tests = [
  {
    name: 'detects beautify request',
    fn: () => {
      assert.equal(detectJsonAction('beautify this json'), 'beautify');
    },
  },
  {
    name: 'detects schema request',
    fn: () => {
      assert.equal(detectJsonAction('generate json schema'), 'schema');
    },
  },
  {
    name: 'generates a schema with properties',
    fn: () => {
      const schema = generateJsonSchema({ name: 'Ada', age: 36 });
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.name);
      assert.equal(schema.properties.age.type, 'number');
    },
  },
  {
    name: 'flattens and unflattens nested data',
    fn: () => {
      const nested = { user: { name: 'Ada' }, active: true };
      const flat = flattenJson(nested);
      assert.equal(flat['user.name'], 'Ada');
      const restored = unflattenJson(flat);
      assert.deepEqual(restored, nested);
    },
  },
];

for (const test of tests) {
  test.fn();
  console.log(`✓ ${test.name}`);
}

console.log(`Passed ${tests.length} tests.`);
