import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/core/constants';
import { session } from '@/core/session';
import { initSession } from '@/services/session-init';
import { gmGetText } from '@/utils/gm';

import { parseAlbumId, parseAlbumImages, processAlbumLinks } from './imgur-albums';

vi.mock('@/utils/gm', () => ({ gmGetText: vi.fn() }));

// 取自 imgur.com/ajaxalbums/getimages/<id>/hit.json 的真实返回，字段删减到本模块用到的部分
const ALBUM_JSON = JSON.stringify({
  data: {
    count: 4,
    images: [
      { hash: 'j4VYjf6', ext: '.jpg' },
      { hash: 'VQRVrWk', ext: '.jpg' },
      { hash: 'f02veP4', ext: '.jpg' },
      { hash: '5O1wADZ', ext: '.jpg' },
    ],
  },
  success: true,
  status: 200,
});

const albumJson = (n: number) =>
  JSON.stringify({
    data: { images: Array.from({ length: n }, (_, i) => ({ hash: `img${i}`, ext: '.png' })) },
  });

describe('parseAlbumId', () => {
  it.each([
    ['https://imgur.com/a/UBWm5pn', 'UBWm5pn'],
    ['https://imgur.com/a/UBWm5pn/', 'UBWm5pn'],
    ['https://imgur.com/a/Some-Title-UBWm5pn', 'UBWm5pn'],
    ['https://imgur.com/gallery/UBWm5pn', 'UBWm5pn'],
    ['https://m.imgur.com/a/UBWm5pn#0', 'UBWm5pn'],
  ])('%s -> %s', (href, id) => {
    expect(parseAlbumId(href)).toBe(id);
  });

  it.each([
    'https://i.imgur.com/UBWm5pn.jpg',
    'https://imgur.com/UBWm5pn',
    'https://imgur.com/a/UBWm5pn/embed',
    'https://notimgur.com/a/UBWm5pn',
  ])('不是相册链接：%s', (href) => {
    expect(parseAlbumId(href)).toBeNull();
  });
});

describe('parseAlbumImages', () => {
  it('取出相册里每张图的直链', () => {
    expect(parseAlbumImages(ALBUM_JSON)).toEqual([
      'https://i.imgur.com/j4VYjf6.jpg',
      'https://i.imgur.com/VQRVrWk.jpg',
      'https://i.imgur.com/f02veP4.jpg',
      'https://i.imgur.com/5O1wADZ.jpg',
    ]);
  });

  it('不是相册时接口返回空数组，得到空结果', () => {
    expect(parseAlbumImages('{"data":[],"success":true,"status":200}')).toEqual([]);
  });

  it('不是 JSON 或结构不对，得到空结果而不是抛错', () => {
    expect(parseAlbumImages('<html>blocked</html>')).toEqual([]);
    expect(parseAlbumImages('{"data":{"images":"x"}}')).toEqual([]);
    expect(parseAlbumImages('null')).toEqual([]);
  });

  it('hash 和后缀要校验：夹带路径或脚本的、视频的都丢掉', () => {
    const bad = JSON.stringify({
      data: {
        images: [
          { hash: '../evil', ext: '.jpg' },
          { hash: 'ok1', ext: '.jpg"onerror="x' },
          { hash: 'vid', ext: '.mp4' },
          { hash: 'good', ext: '.GIF' },
        ],
      },
    });
    expect(parseAlbumImages(bad)).toEqual(['https://i.imgur.com/good.GIF']);
  });
});

describe('processAlbumLinks', () => {
  const mount = (id: string, text = `https://imgur.com/a/${id}`) => {
    document.body.innerHTML = `<div id="app"><a href="https://imgur.com/a/${id}">${text}</a></div>`;
  };

  beforeEach(() => {
    initSession();
    session.config = getDefaultConfig({ parseImgur: true });
    vi.mocked(gmGetText).mockReset();
  });

  it('开关打开：相册链接展开成它的全部图片', async () => {
    vi.mocked(gmGetText).mockResolvedValue(ALBUM_JSON);
    mount('AAAAA01');
    await processAlbumLinks();
    const imgs = document.querySelectorAll('#app a img');
    expect(imgs).toHaveLength(4);
    expect(imgs[0].getAttribute('src')).toBe('https://i.imgur.com/j4VYjf6.jpg');
    expect(gmGetText).toHaveBeenCalledWith(
      'https://imgur.com/ajaxalbums/getimages/AAAAA01/hit.json',
    );
  });

  it('开关关闭：不请求，链接保持原样', async () => {
    session.config = getDefaultConfig({ parseImgur: false });
    mount('AAAAA02');
    await processAlbumLinks();
    expect(gmGetText).not.toHaveBeenCalled();
    expect(document.querySelector('#app a img')).toBeNull();
  });

  it('链接文字不是地址时不动它', async () => {
    mount('AAAAA03', '看我的相册');
    await processAlbumLinks();
    expect(gmGetText).not.toHaveBeenCalled();
  });

  it('请求失败或不是相册：保持原样的链接', async () => {
    vi.mocked(gmGetText).mockRejectedValue(new Error('网络错误'));
    mount('AAAAA04');
    await processAlbumLinks();
    expect(document.querySelector('#app a img')).toBeNull();
    expect(document.querySelector('#app a')?.textContent).toBe('https://imgur.com/a/AAAAA04');
  });

  it('超过上限只展开前 12 张，并提示总数', async () => {
    vi.mocked(gmGetText).mockResolvedValue(albumJson(20));
    mount('AAAAA05');
    await processAlbumLinks();
    expect(document.querySelectorAll('#app a img')).toHaveLength(12);
    expect(document.querySelector('.v2n-album-more')?.textContent).toBe('共 20 张，点击查看全部');
  });

  it('同一个相册在页面里出现多次只请求一次', async () => {
    vi.mocked(gmGetText).mockResolvedValue(ALBUM_JSON);
    document.body.innerHTML = `<div id="app">${'<a href="https://imgur.com/a/AAAAA06">https://imgur.com/a/AAAAA06</a>'.repeat(3)}</div>`;
    await processAlbumLinks();
    expect(gmGetText).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('#app a img')).toHaveLength(12);
  });
});
