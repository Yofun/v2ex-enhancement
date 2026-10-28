import { createElement } from 'react';

import { createRoot } from 'react-dom/client';

import { DefaultVal, getDefaultPost } from '@/core/constants';
import { session } from '@/core/session';
import { PageType } from '@/core/types';
import { parse } from '@/parsers';
import { initNoteData } from '@/services/note-data';
import { initSession } from '@/services/session-init';
import { qianDao } from '@/services/signin';
import { applyDynamicStyle, removeDynamicStyle } from '@/styles/dynamic-style';
import globalCss from '@/styles/global.scss?inline';
import { htmlToElement } from '@/utils/dom';
import { functions } from '@/utils/functions';
import { injectStyle } from '@/utils/style';

import { App } from './app';

const send = (...args: Parameters<typeof functions.cbChecker>): void => {
  void functions.cbChecker(...args);
};

function createHeaderWrap(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.classList.add('post-item');
  if (session.config.viewType === 'card') wrap.classList.add('preview');
  return wrap;
}

/** 去掉 box 的阴影/背景，让每个 post-item 自带卡片样式 */
function flattenBox(box: HTMLElement): void {
  box.style.boxShadow = 'unset';
  box.style.background = 'unset';
  box.style.overflow = 'hidden';
}

function markLastAsPostItem(box: HTMLElement): void {
  const last = box.lastElementChild;
  if (!last) return;
  last.classList.add('cell', 'post-item');
  if (session.config.viewType === 'card') last.classList.add('preview');
}

function handleNodePage($section: HTMLElement): void {
  const box = document.querySelectorAll<HTMLElement>('#Wrapper #Main .box');
  try {
    let headerWrap = createHeaderWrap();
    box[1].prepend(headerWrap);
    Array.from(box[1].children)
      .slice(1, 3)
      .forEach((el) => {
        if (el.classList.contains('cell')) headerWrap.append(el);
      });
    headerWrap = createHeaderWrap();
    box[1].append(headerWrap);
    Array.from(box[1].children)
      .slice(2)
      .forEach((el) => {
        if (el.classList.contains('cell')) headerWrap.append(el);
      });
    flattenBox(box[1]);
  } catch (e) {
    console.log('PageType-Node解析报错了', e);
  }
  const list = box[1].querySelector('#TopicsNode')!.querySelectorAll('.cell');
  list[0].before($section);
  parse.parsePagePostList(list, box[1]);
}

function handleHomePage($section: HTMLElement): void {
  const box = document.querySelector<HTMLElement>('#Wrapper #Main .box')!;
  try {
    const headerWrap = createHeaderWrap();
    box.prepend(headerWrap);
    Array.from(box.children)
      .slice(1, 3)
      .forEach((el) => {
        if (!el.classList.contains('item')) headerWrap.append(el);
      });
    // 原脚本的 isDeadline（dayjs() 晚于 2024-11-26）早已恒为 true
    const currentTab = Array.from(document.querySelectorAll('.tab_current'))
      .map((el) => el.textContent)
      .join('');
    if (currentTab == '最热') {
      headerWrap.append(
        htmlToElement(
          `<div class="cell" id="SecondaryTabs"><div class="fr"><a href="/v2hot?3">3天最热</a> &nbsp; &nbsp; <a href="/v2hot?7">7天最热</a> &nbsp; &nbsp; <a href="/v2hot?30">30天最热</a> &nbsp; &nbsp; <a href="/v2hot?setting"><i class="fa fa-calendar" aria-hidden="true"></i></a></div><a href="/v2hot?-1">昨天最热</a> &nbsp; &nbsp; <a href="/v2hot?-2">前天最热</a> &nbsp; &nbsp; </div>`,
        ),
      );
    }
    markLastAsPostItem(box);
    flattenBox(box);
  } catch (e) {
    console.log('PageType-Home解析报错了', e);
  }
  const list = box.querySelectorAll('.item');
  list[0].before($section);
  parse.parsePagePostList(list, box);
}

async function handlePostPage($section: HTMLElement): Promise<boolean> {
  const box = document.querySelector('#Wrapper #Main .box')!;
  box.after($section);
  const tooMany = await functions.checkPostReplies(session.pageData.id!, false);
  if (tooMany) {
    session.stopMe = true;
    send({ type: 'syncData' });
    send({ type: 'warningNotice', value: '由于回复数量较多，脚本已停止解析楼中楼' });
    return false;
  }
  if (session.config.postWidth) {
    const main = document.querySelector<HTMLElement>('#Main');
    if (main) {
      main.style.width = session.config.postWidth;
      main.style.margin = 'unset';
      const content = document.querySelector<HTMLElement>('#Wrapper > .content');
      if (content) {
        content.style.maxWidth = 'unset';
        content.style.display = 'flex';
        content.style.justifyContent = 'center';
        content.style.gap = '20px';
      }
      const rightbar = document.querySelector('#Rightbar');
      if (rightbar) main.after(rightbar);
    }
  }
  const post = getDefaultPost({ id: session.pageData.id });
  const body = document.body;
  const htmlText = document.documentElement.outerHTML;
  parse
    .parsePostContent(post, body, htmlText)
    .then(async (res) => {
      await functions.cbChecker({ type: 'postContent', value: res });
      await parse.parseOp(res);
    })
    .catch((e) => console.error('[V2Next] 解析主题内容失败', e));
  parse
    .getPostAllReplies(post, body, htmlText, session.pageData.pageNo ?? 1)
    .then((res) => functions.cbChecker({ type: 'postReplies', value: res }))
    .catch((e) => console.error('[V2Next] 解析主题回复失败', e));
  return true;
}

function handleMemberPage($section: HTMLElement): void {
  const box = document.querySelectorAll<HTMLElement>('#Wrapper #Main .box');
  if (location.pathname.includes('/replies') || location.pathname.includes('/topics')) {
    box[0].after($section);
    return;
  }
  if (session.config.openTag) {
    box[0].style.borderBottom = 'none';
    box[0].style.borderBottomLeftRadius = '0';
    box[0].style.borderBottomRightRadius = '0';
  }
  try {
    const headerWrap = createHeaderWrap();
    box[1].prepend(headerWrap);
    Array.from(box[1].children)
      .slice(1, 2)
      .forEach((el) => {
        if (!el.classList.contains('item')) headerWrap.append(el);
      });
    markLastAsPostItem(box[1]);
    flattenBox(box[1]);
  } catch (e) {
    console.log('PageType-Member解析报错了', e);
  }
  const list = box[1].querySelectorAll('.cell');
  box[0].after($section);
  parse.parsePagePostList(list, box[1]);
}

function addSettingText(): void {
  document.querySelectorAll('.tools').forEach((tools) => {
    const app = htmlToElement(
      `<a href="${DefaultVal.mobileScript}" target='_blank' class="top"><i class="fa fa-android" aria-hidden="true"></i></a>`,
    );
    tools.prepend(app);
    const setting = htmlToElement(
      `<a href="/" class="top v2next-setting"><span>脚本设置</span></a>`,
    );
    setting.addEventListener('click', (e) => {
      functions.stopEvent(e);
      send({ type: 'openSetting' });
    });
    tools.prepend(setting);
  });
}

/** 图片（imgur 代理等）加载失败时，还原成原始链接 */
function onImageError(e: Event): void {
  const dom = e.target;
  if (!(dom instanceof Element)) return;
  const originImgUrl = dom.getAttribute('originUrl');
  if (originImgUrl) {
    const a = document.createElement('a');
    a.href = originImgUrl;
    a.setAttribute('notice', '此标签由v2ex超级增强脚本转换图片失败后恢复');
    a.innerText = originImgUrl;
    a.target = '_blank';
    dom.replaceWith(a);
  }
}

async function init($section: HTMLElement): Promise<void> {
  const top2 = document.querySelector('.tools .top:nth-child(2)');
  if (top2 && top2.textContent !== '注册') {
    session.isLogin = true;
    session.user.username = top2.textContent ?? '';
    session.user.avatar =
      document.querySelector('#Rightbar .box .avatar')?.getAttribute('src') ?? '';
  }
  functions.initConfig();
  const { pageData, pageType, username } = functions.checkPageType();
  session.pageType = pageType ?? undefined;
  session.pageData = pageData;
  session.targetUserName = username;
  applyDynamicStyle(session.config);

  switch (session.pageType) {
    case PageType.Node:
      handleNodePage($section);
      break;
    case PageType.Changes:
    case PageType.Home:
      handleHomePage($section);
      break;
    case PageType.Post:
      if (!(await handlePostPage($section))) return;
      break;
    case PageType.Member:
      handleMemberPage($section);
      break;
    default:
      session.stopMe = true;
      send({ type: 'syncData' });
      console.error('未知页面');
      break;
  }

  if (session.isLogin) {
    initNoteData().catch((e) => console.error('[V2Next] 读取记事本数据失败', e));
    try {
      if (session.config.autoSignin) qianDao();
    } catch {
      console.log('签到失败');
    }
  }
  addSettingText();
  functions.initMonkeyMenu();
}

function runPage($section: HTMLElement): void {
  session.canParseV2exPage = !location.search.includes('script');
  if (session.canParseV2exPage) {
    init($section).catch((e) => console.error('[V2Next] 初始化失败', e));
    return;
  }
  document.querySelector('#Wrapper #Main .box')?.after($section);
  session.stopMe = true;
  send({ type: 'syncData' });
  if (location.search.includes('script=0')) {
    send({ type: 'warningNotice', value: '脚本无法查看此主题，已为您单独打开此主题' });
  }
  if (location.search.includes('script=1')) {
    send({
      type: 'warningNotice',
      value: '由于回复数量较多，已为您单独打开此主题并停止解析楼中楼',
    });
  }
}

/** 启动 V2Next：仅 PC 端（存在 #Rightbar）运行。返回清理函数 */
export function bootstrap(): (() => void) | undefined {
  if (!document.querySelector('#Rightbar')) return undefined;
  if (!functions.checkPageType().pageType) return undefined;
  console.log('V2EX PC端');

  const globalStyle = injectStyle(globalCss);
  initSession();
  if (session.isNight) document.documentElement.classList.add('dark');

  const $section = document.createElement('section');
  $section.id = 'app';
  runPage($section);
  const root = createRoot($section);
  root.render(createElement(App));
  window.addEventListener('error', onImageError, true);

  return () => {
    window.removeEventListener('error', onImageError, true);
    root.unmount();
    $section.remove();
    removeDynamicStyle();
    globalStyle.remove();
  };
}
