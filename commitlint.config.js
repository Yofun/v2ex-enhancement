import { readFileSync } from 'node:fs';

// type 列表以 .release-it.json 的 changelog preset 为准，避免两处各写一份而漂移：
// 往 preset 里加一个 type，这里自动跟上。
const releaseIt = JSON.parse(readFileSync(new URL('.release-it.json', import.meta.url), 'utf8'));
const types = releaseIt.plugins['@release-it/conventional-changelog'].preset.types.map(
  (t) => t.type,
);

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        // config-conventional 管不了语言，这条用来挡住中文等非 ASCII 字符
        'ascii-only': ({ raw }) => [
          // eslint-disable-next-line no-control-regex
          !/[^\x00-\x7F]/.test(raw ?? ''),
          'commit message must be English (ASCII only)',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [2, 'always', types],
    'ascii-only': [2, 'always'],
  },
};
