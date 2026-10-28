import { session } from '@/core/session';
import { PageType } from '@/core/types';
import { fetchBody } from '@/utils/dom';

const STORAGE_KEY = 'menu_clockInTime';

async function redeem(qiandao: HTMLAnchorElement | null, timeNow: string): Promise<void> {
  const once = /once=(\d+)/.exec(
    document.querySelector('div#Top .tools, #menu-body')?.innerHTML ?? '',
  );
  if (!once) return;
  const body = await fetchBody(`${location.origin}/mission/daily/redeem?${once[0]}`);
  if (body.querySelector('li.fa.fa-ok-sign')) {
    const days = body.querySelector('#Main')?.textContent?.match(/已连续登录 (\d+?) 天/)?.[0] ?? '';
    localStorage.setItem(STORAGE_KEY, timeNow);
    console.info('[V2Next] 自动签到完成！');
    if (qiandao) {
      qiandao.textContent = `自动签到完成！${days}`;
      qiandao.href = 'javascript:void(0);';
    }
  } else {
    console.warn(
      '[V2Next] 自动签到失败！请关闭其他插件或脚本。如果连续几天都签到失败，请联系作者解决！',
    );
    if (qiandao) qiandao.textContent = '自动签到失败！请尝试手动签到！';
  }
}

async function checkStatus(timeNow: string): Promise<void> {
  const body = await fetchBody(`${location.origin}/mission/daily`);
  if (body.querySelector('input[value^="领取"]')) {
    await redeem(null, timeNow);
  } else {
    console.info('[V2Next] 已经签过到了。');
    localStorage.setItem(STORAGE_KEY, timeNow);
  }
}

/** 自动签到：首页读取页面上的签到入口，其它页面按本地记录的日期判断 */
export function qianDao(): void {
  const now = new Date();
  const timeNow = `${now.getUTCFullYear()}/${now.getUTCMonth() + 1}/${now.getUTCDate()}`;
  if (session.pageType === PageType.Home) {
    const qiandao = document.querySelector<HTMLAnchorElement>(
      '.box .inner a[href="/mission/daily"]',
    );
    if (qiandao) {
      redeem(qiandao, timeNow).catch((e) => console.error('[V2Next] 自动签到出错', e));
    } else {
      const gift = document.getElementById('gift_v2excellent');
      if (gift) {
        gift.click();
        localStorage.setItem(STORAGE_KEY, timeNow);
      }
    }
  } else {
    const timeOld = localStorage.getItem(STORAGE_KEY);
    if (!timeOld || timeOld != timeNow) {
      checkStatus(timeNow).catch((e) => console.error('[V2Next] 获取签到状态出错', e));
    }
  }
}
