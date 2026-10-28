import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { genDomFromHtmlString } from '@/utils/dom';

export function loadFixture(name: string): string {
  return readFileSync(resolve(process.cwd(), 'e2e/fixtures', name), 'utf8');
}

export function loadFixtureDom(name: string): { html: string; body: HTMLElement } {
  const html = loadFixture(name);
  return { html, body: genDomFromHtmlString(html) };
}
