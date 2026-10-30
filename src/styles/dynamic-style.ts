import { session } from '@/core/session';
import type { Config } from '@/core/types';
import { PageType } from '@/core/types';
import { injectStyle } from '@/utils/style';

/** 依赖 config / 当前页面的样式模板（原 initStyle 里的 style2） */
export function buildDynamicStyle(config: Config): string {
  const isSimple = config.viewType === 'simple';
  const { pathname, href } = location;
  return `
html, body {
  font-size: 62.5%;
}

:root{
  --box-border-radius:8px;
}

.page_current, .page_normal {
  --box-border-radius: 5px;
  padding: .6rem 0.8rem!important;
}
.box{
  box-shadow:rgba(0, 0, 0, 0.08) 0px 4px 12px;
}

#Tabs{
  border-top-left-radius: var(--box-border-radius) !important;
  border-top-right-radius: var(--box-border-radius) !important;
}

#Main .cell .count_livid {
  font-size: 14px;
  font-weight: bold;
  padding: 3px 10px;
  border-radius: 5px;
}

#Wrapper {
  height: unset !important;
  width: unset !important;
}

#Wrapper > .content {
  height: unset !important;
  width: unset !important;
  max-width:1100px !important;
}

${
  pathname.includes('wow') || pathname.includes('tokyo')
    ? ''
    : `
.post-item {
  background: var(--v2n-card-bg);
}
`
}

.post-item > .post-content {
  height: 0;
  margin-top: 0;
}

.post-item:hover .toggle {
  display: flex;
}

.toggle {
  position: absolute;
  right: ${isSimple ? '5rem' : 0};
  top: ${isSimple ? 0 : '0.5rem'};
  width: 5rem;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--v2n-link);
  display: none;
  padding-right: 1rem;
}

.preview {
  margin: 1rem 0;
  border: 1px solid transparent;
  border-radius: var(--box-border-radius);
  cursor: pointer;
  transition: border-color .2s;
}

.preview:hover {
  border-color: var(--color-input-border-hover);
}

.preview > .post-content {
  height: unset !important;
  margin-top: 0.5rem !important;
}

.preview > .post-content.show-all {
  max-height: unset;
  -webkit-mask-image:none;
}

.preview  .topic-link:link {
  color: var(--color-font-pure) !important;
}

.post-content {
  margin-top: 0.5rem;
  display: block;
  max-height: 30rem;
  overflow: hidden;
  text-decoration: unset !important;
  line-break: anywhere;
  -webkit-mask-image: linear-gradient(180deg,#000 60%,transparent);
}

.show-more {
  display: none;
}

.preview > .show-more {
  font-size: 1.3rem;
  text-align: right;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 9;
}

.post-content:visited {
  color: var(--color-font-3) !important;
}

.post-content:link {
  color: var(--color-font-8);
}

${
  href.includes('wow')
    ? ''
    : `
html.dark .post-item {
  background: var(--v2n-card-bg) !important;
}
`
}

html.dark .preview {
  border-color: var(--color-line);
}

${
  isSimple
    ? `
${
  session.pageType !== PageType.Member
    ? `
/* 只留标题和回复数：隐藏头像、节点、作者、时间 */
.item table tr td:first-child{display:none;}
.item table tr td .sep5{display:none;}
.item table tr td .topic_info{display:none;}
.avatar,#avatar{display:none;}

/* 一行只剩标题了，内边距跟着收紧。分隔线保留宿主自带的那条（主题会重新着色），
   去掉它整列就没有任何分隔，很难扫视。 */
.cell.item{padding-top:10px!important;padding-bottom:10px!important;}
`
    : ''
}

#Rightbar .cell table:first-child tr td:first-child{display:none;}
`
    : ''
}

${
  config.customBgColor
    ? `#Wrapper {
  background: ${config.customBgColor} !important;
  background-image: unset !important;
}`
    : ''
}

.top{
  position:relative;
}

.new{
  position: absolute;
  background: var(--v2n-danger);
  font-size: 10px;
  border-radius: 4px;
  padding: 0px 2px;
  color: white;
  right: -9px;
  top: -3px;
}

/*解决hdr头像太亮的问题——只作用于头像，不要波及帖子正文配图*/
.avatar, #avatar{filter: brightness(0.95) contrast(0.95) saturate(0.95);}
`;
}

let styleEl: HTMLStyleElement | null = null;

/** 根据 config 生成并注入动态样式；config 变化时再次调用即可刷新 */
export function applyDynamicStyle(config: Config): void {
  const css = buildDynamicStyle(config);
  if (styleEl?.isConnected) {
    styleEl.textContent = css;
  } else {
    styleEl = injectStyle(css);
  }
}

export function removeDynamicStyle(): void {
  styleEl?.remove();
  styleEl = null;
}
