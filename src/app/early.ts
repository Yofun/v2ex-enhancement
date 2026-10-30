import homeThemeCss from '@/styles/home-theme.scss?inline';
import { injectStyle } from '@/utils/style';

export const HOME_THEME_KEY = 'v2n-home-theme';
export const NIGHT_KEY = 'v2n-night';

// 广告卡片在页面一出现就隐藏，避免先闪一下再被 ad-filter 移除
const AD_CSS = `
#Rightbar > #pro-campaign-container { display: none !important; }
#Rightbar > .sep20:has(+ #pro-campaign-container) { display: none !important; }
`;

/**
 * 在 document-start 立即执行：注入首页主题样式并设置 html 上的 class，
 * 否则要等 DOMContentLoaded 和 React 挂载后才生效，页面会先以原样式闪现。
 * 返回撤销函数（非 PC 页面时使用）。
 */
export function earlyBoot(): () => void {
  const root = document.documentElement;
  const style = injectStyle(homeThemeCss + AD_CSS);
  const isHome = location.pathname === '/';
  const homeOn = isHome && localStorage.getItem(HOME_THEME_KEY) !== '0';
  const nightCached = localStorage.getItem(NIGHT_KEY) === '1';
  if (homeOn) root.classList.add('v2n-home');
  if (nightCached) root.classList.add('dark');
  return () => {
    style.remove();
    root.classList.remove('v2n-home');
    if (nightCached) root.classList.remove('dark');
  };
}
