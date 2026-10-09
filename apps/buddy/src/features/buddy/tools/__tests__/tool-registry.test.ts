/// <reference types="jest" />
import { READ_TOOL_NAMES } from '../../contracts/tool-protocol';
import { DISABLED_WRITE_TOOLS, modelToolDefinitions, TOOL_MANIFEST } from '../tool-registry';

it('exposes exactly the allowed reads and one confirmed write to the model', () => {
  expect(TOOL_MANIFEST.map((entry) => entry.name)).toEqual([...READ_TOOL_NAMES, 'notes.create']);
  expect(TOOL_MANIFEST.find((entry) => entry.name === 'notes.create')?.permission).toBe('always-confirmed-sensitive-write');
  expect(modelToolDefinitions().every((tool) => tool.function.parameters.additionalProperties === false)).toBe(true);
  expect(DISABLED_WRITE_TOOLS.every((name) => !TOOL_MANIFEST.some((entry) => String(entry.name) === name))).toBe(true);
});
