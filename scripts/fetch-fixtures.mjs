// 下载 vitest / e2e 用到的 V2EX 公开页面样本（未登录）与 CDN 依赖。已存在则跳过。
// 样本含第三方论坛内容，不入库，统一放到被 gitignore 的 e2e/fixtures/。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'e2e/fixtures');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const V2 = 'https://www.v2ex.com';
const CDN = 'https://cdn.jsdelivr.net/npm';
const files = {
  'home.html': `${V2}/`,
  'node.html': `${V2}/go/programmer`,
  'member.html': `${V2}/member/Livid`,
  'recent.html': `${V2}/recent`,
  'topic_1252074.html': `${V2}/t/1252074`,
  'topic_1252074.p2.html': `${V2}/t/1252074?p=2`,
  'topic_1252085.html': `${V2}/t/1252085`,
  'topic_1252085.p2.html': `${V2}/t/1252085?p=2`,
  'api_topic_1252074.json': `${V2}/api/topics/show.json?id=1252074`,
  'api_topic_1252085.json': `${V2}/api/topics/show.json?id=1252085`,
  'cdn/jquery.min.js': `${CDN}/jquery@3.7.1/dist/jquery.min.js`,
  'cdn/vue.global.prod.min.js': `${CDN}/vue@3.5.21/dist/vue.global.prod.min.js`,
  'cdn/dayjs.min.js': `${CDN}/dayjs@1.11.18/dayjs.min.js`,
};

let failed = false;
for (const [name, url] of Object.entries(files)) {
  const target = resolve(dir, name);
  if (existsSync(target)) continue;
  try {
    mkdirSync(dirname(target), { recursive: true });
    // 用 curl 而不是 fetch：curl 遵循 HTTP(S)_PROXY 环境变量
    execFileSync(
      'curl',
      [
        '-sfL',
        '--max-time',
        '30',
        '-A',
        UA,
        '-H',
        'Accept-Language: zh-CN,zh;q=0.9',
        '-o',
        `${target}.part`,
        url,
      ],
      { stdio: 'pipe' },
    );
    renameSync(`${target}.part`, target);
    console.log(`fetched ${name}`);
  } catch (e) {
    failed = true;
    console.error(`failed ${name} <- ${url}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
