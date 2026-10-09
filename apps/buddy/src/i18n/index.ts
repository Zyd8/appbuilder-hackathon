import { en, type StringKey } from './en';

export type { StringKey };

/** Look up a string and fill `{{name}}` placeholders. English only for now. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const template: string = en[key];
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
