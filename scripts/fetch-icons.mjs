// 生成 src/components/base/icons-data.ts：从 iconify API 拉取离线图标数据。
// 全部图标统一取自 Phosphor（ph），同一套线宽与 256x256 网格，避免多套图标混用导致视觉不一致。
// 新增图标：往下面的 ICONS 里加一个名字，然后 `yarn icons`。
import { writeFileSync } from 'node:fs';

const PREFIX = 'ph';

// 按用途分组，便于查找；值就是 ph 的图标名
const ICONS = [
  // 通用
  'x',
  'info',
  'gear',
  'tag',
  'article',
  'github-logo',
  'translate',
  'trash',
  'question',
  // 方向 / 展开收起
  'caret-up',
  'caret-down',
  'caret-left',
  'caret-right',
  'caret-up-bold',
  'caret-down-bold',
  'arrow-up',
  'arrow-down',
  'arrow-line-down',
  'arrows-out-simple',
  'arrows-in-line-vertical',
  'arrow-square-out',
  'arrow-clockwise',
  // 评论区操作
  'chat-circle',
  'eye-slash',
  'file-magnifying-glass',
  'dots-three-circle',
  'heart',
  'heart-fill',
  'star',
  'star-fill',
  'share-network',
  'warning',
  'lightbulb',
  // 编辑器
  'smiley',
  'image',
];

const url = `https://api.iconify.design/${PREFIX}.json?icons=${ICONS.join(',')}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`iconify 返回 ${res.status}`);
const data = await res.json();

if (data.not_found?.length) {
  throw new Error(`这些图标在 ${PREFIX} 里不存在: ${data.not_found.join(', ')}`);
}

const defaultW = data.width ?? 24;
const defaultH = data.height ?? 24;
const entries = ICONS.map((name) => {
  const icon = data.icons[name];
  if (!icon) throw new Error(`未返回图标 ${name}`);
  return [
    `  '${PREFIX}:${name}': {`,
    `    body: ${JSON.stringify(icon.body)},`,
    `    width: ${icon.width ?? defaultW},`,
    `    height: ${icon.height ?? defaultH},`,
    `  },`,
  ].join('\n');
});

const out = `// 离线图标数据，由 scripts/fetch-icons.mjs 生成，请勿手动编辑。
// 全部取自 Phosphor（https://phosphoricons.com），统一线宽与 ${defaultW}x${defaultH} 网格。
export interface IconData {
  body: string;
  width: number;
  height: number;
}

export const iconsData: Record<string, IconData> = {
${entries.join('\n')}
};
`;

writeFileSync(new URL('../src/components/base/icons-data.ts', import.meta.url), out);
console.log(`已写入 ${ICONS.length} 个图标`);
