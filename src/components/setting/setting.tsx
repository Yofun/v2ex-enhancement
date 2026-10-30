import { useEffect, useRef, useState } from 'react';

import dayjs from 'dayjs';
import type { ChangeEvent, CSSProperties, ReactNode } from 'react';

import { useApp } from '@/app/app-context';
import { BaseButton } from '@/components/base/base-button';
import { BaseSelect } from '@/components/base/base-select';
import { BaseSwitch } from '@/components/base/base-switch';
import { Icon } from '@/components/base/icon';
import { DefaultVal } from '@/core/constants';
import { CMD, eventBus } from '@/core/event-bus';
import type { Config, NoticeConfig, ViewType } from '@/core/types';
import { functions } from '@/utils/functions';

import { ImageRules } from './image-rules';
import styles from './setting.module.scss';

export interface SettingProps {
  show: boolean;
  onUpdateShow: (show: boolean) => void;
}

const FADE_DURATION = 300;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

// 原 window.isDeadline
const isDeadline = () => dayjs().isAfter(dayjs('2024-11-26'));

// Vue v-model 对 type=number 输入框的转换：无法转成数字时保留原字符串
const looseToNumber = (val: string): number => {
  const n = parseFloat(val);
  return (Number.isNaN(n) ? val : n) as number;
};

const normalize = (config: Config): Config => {
  let min = Math.trunc(config.topReplyLoveMinCount);
  if (min < 0) min = 1;
  return { ...config, topReplyLoveMinCount: min };
};

/** 输入过程中只改本地值，失焦时才提交（对应原 :value + @blur） */
function BlurInput({
  value,
  onCommit,
  ...rest
}: {
  value: string | number;
  onCommit: (value: string) => void;
  type: 'text' | 'number';
  style?: CSSProperties;
}) {
  const [draft, setDraft] = useState(String(value));
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => onCommit(e.target.value)}
    />
  );
}

export function Setting({ show, onUpdateShow }: SettingProps) {
  const { config, setConfig, isLogin } = useApp();
  const [tabIndex, setTabIndex] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importOk, setImportOk] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [endTime, setEndTime] = useState<number | string>('0');

  // 对应 Vue 的 <Transition>：先挂载并带 enter-from，下一帧去掉；关闭时先淡出再卸载
  const [phase, setPhase] = useState<'hidden' | 'enter-from' | 'entered' | 'leave'>(
    show ? 'entered' : 'hidden',
  );
  const [lastShow, setLastShow] = useState(show);
  if (lastShow !== show) {
    setLastShow(show);
    setPhase(show ? 'enter-from' : 'leave');
  }
  useEffect(() => {
    if (phase === 'enter-from') {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase('entered'));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    if (phase === 'leave') {
      const timer = setTimeout(() => setPhase('hidden'), FADE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // 原 watch: show（非 immediate，仅在变化时触发）
  const prevShow = useRef(show);
  useEffect(() => {
    if (prevShow.current === show) return;
    prevShow.current = show;
    if (show) {
      if (config.version < DefaultVal.currentVersion) {
        document.querySelectorAll('.v2next-new').forEach((el) => el.remove());
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [show, config.version]);

  const update = (patch: Partial<Config>) => setConfig((prev) => normalize({ ...prev, ...patch }));
  const updateNotice = (patch: Partial<NoticeConfig>) =>
    setConfig((prev) => normalize({ ...prev, notice: { ...prev.notice, ...patch } }));
  const numberInput =
    (key: 'topReplyCount' | 'topReplyLoveMinCount') => (e: ChangeEvent<HTMLInputElement>) =>
      update({ [key]: looseToNumber(e.target.value) });

  const isNew = config.version < DefaultVal.currentVersion && isDeadline();

  const goPost = () => {
    fetch(DefaultVal.hotUrl + 'new.txt')
      .then(async (r) => {
        const text = await r.text();
        functions.openNewTab(text || DefaultVal.git, true);
      })
      .catch(() => functions.openNewTab(DefaultVal.git, true));
  };

  const close = () => {
    if (isDeadline()) {
      setConfig((prev) => ({ ...prev, version: DefaultVal.currentVersion }));
    }
    onUpdateShow(false);
  };

  const exportCollectList = async () => {
    if (!isLogin) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '请先登录！' });
      return;
    }
    const fetchPage = async (i: number) => {
      const res = await fetch(`/my/topics?p=${i}`);
      const body = functions.genDomFromHtmlString(await res.text()) as HTMLElement;
      const pages = body.querySelectorAll('.page_normal');
      const total = Number(pages[pages.length - 1]?.textContent ?? '');
      const list: { title: string; url: string }[] = [];
      body.querySelectorAll<HTMLAnchorElement>('.topic-link').forEach((a) => {
        const parsed = functions.parseA(a);
        list.push({ title: parsed.title, url: location.origin + '/t/' + parsed.id });
      });
      return { list, total };
    };
    try {
      setExportLoading(true);
      const first = await fetchPage(1);
      let allList = first.list;
      if (first.total > 1) {
        const pages = [];
        for (let i = 2; i <= first.total; i++) pages.push(fetchPage(i));
        const results = await Promise.allSettled(pages);
        for (const r of results) {
          if (r.status === 'fulfilled') allList = allList.concat(r.value.list);
        }
      }
      const pom = document.createElement('a');
      pom.setAttribute(
        'href',
        'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(allList, null, 2)),
      );
      pom.setAttribute('download', 'V2EX-收藏.json');
      pom.click();
      eventBus.emit(CMD.SHOW_MSG, { type: 'success', text: '收藏列表导出成功！' });
    } catch {
      eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '收藏列表导出失败！' });
    } finally {
      setExportLoading(false);
    }
  };

  const importCollectList = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isLogin) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '请先登录！' });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'json') {
      eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '请导入 json 格式文件！' });
    }
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = async () => {
      if (!reader.result) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '数据为空！' });
        return;
      }
      try {
        const list = JSON.parse(reader.result as string) as { url: string; title: string }[];
        setImportLoading(true);
        setTotal(list.length);
        for (let i = 0; i < list.length; i++) {
          setEndTime(Math.floor(((list.length - i) * 10) / 60));
          setIndex(i);
          const v = list[i];
          const a = document.createElement('a');
          a.href = v.url;
          const { id } = functions.parseA(a);
          a.remove();
          const apiRes = await fetch(v.url);
          const htmlText = await apiRes.text();
          if (
            htmlText.search('你要查看的页面需要先登录') > -1 ||
            apiRes.status === 404 ||
            apiRes.redirected
          ) {
            console.log('无权限', v.url, v.title);
            continue;
          }
          if (htmlText.search('加入收藏') > -1) {
            console.log('未收藏========>>', v.url, v.title);
            const once = await functions.refreshOnce();
            await fetch(`${location.origin}/favorite/topic/${id}?once=${once}`);
            await functions.sleep(1e4);
          } else {
            console.log('已收藏', v.url, v.title);
          }
          await functions.sleep(1e3);
        }
        setImportLoading(false);
        setImportOk(true);
      } catch {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '数据解析失败！' });
      }
    };
    setShowInput(false);
    setTimeout(() => setShowInput(true), 200);
  };

  const tabs = [
    { icon: 'weui:setting-outlined', label: '列表' },
    { icon: 'stash:article-alt-light', label: '主题' },
    { icon: 'fluent:more-circle-20-regular', label: '其他' },
    { icon: 'lets-icons:img-load-box-fill', label: '图片' },
    { icon: 'ix:about', label: '关于' },
  ];

  const viewTypeOption = (type: ViewType, label: string, onClick: () => void) => (
    <div className={cx(styles.radio, config.viewType === type && styles.active)} onClick={onClick}>
      {label}
    </div>
  );

  const switchRow = (
    title: ReactNode,
    value: boolean,
    onChange: (v: boolean) => void,
    border?: boolean,
  ) => (
    <div className={cx(styles.row, border && styles.border)}>
      <label className={styles['item-title']}>{title}</label>
      <div className={styles.wrapper}>
        <BaseSwitch modelValue={value} onUpdateModelValue={onChange} />
      </div>
    </div>
  );

  if (phase === 'hidden') return null;

  const fadeClass =
    phase === 'enter-from'
      ? cx(styles['fade-enter-active'], styles['fade-enter-from'])
      : phase === 'leave'
        ? cx(styles['fade-leave-active'], styles['fade-leave-to'])
        : '';

  return (
    <div className={cx(styles['setting-modal'], styles.modal, fadeClass)}>
      <div className={styles.mask} onClick={close} />
      <div className={styles['modal-root']}>
        <div className={styles['modal-header']}>
          <div className={styles.title}>脚本设置</div>
          <Icon icon="ic:round-close" onClick={close} />
        </div>
        {isNew && (
          <div className={styles.log}>
            <a onClick={goPost}>
              New：手机App现已发布，支持楼中楼！PC脚本新增历史最热数据、imgur换源功能！点击查看详细介绍
            </a>
            <div className={styles.new} />
          </div>
        )}
        <div className={styles.body}>
          <div className={styles.left}>
            <div className={styles.tabs}>
              {tabs.map((tab, i) => (
                <div
                  key={tab.label}
                  className={cx(styles.tab, tabIndex === i && styles.active)}
                  onClick={() => setTabIndex(i)}
                >
                  <Icon icon={tab.icon} />
                  <span>{tab.label}</span>
                </div>
              ))}
            </div>
            <div className={styles.bottom}>
              <div className={styles.tip}> 如果可以的话欢迎点个star支持一下~ </div>
              <div className={styles.icons}>
                <a href={DefaultVal.git} target="_blank" rel="noreferrer">
                  <Icon icon="mdi:github" />
                </a>
              </div>
            </div>
          </div>
          <div className={styles['modal-content']}>
            <div className={styles.scroll}>
              {tabIndex === 0 && (
                <div className={styles.card}>
                  <div className={styles.border}>
                    <div className={styles.row}>
                      <label className={styles['item-title']}>列表展示方式</label>
                      <div className={styles.wrapper}>
                        <div className={styles['radio-group2']}>
                          {viewTypeOption('simple', '简洁 ', () => update({ viewType: 'simple' }))}
                          {viewTypeOption('table', '表格 ', () => update({ viewType: 'table' }))}
                        </div>
                      </div>
                    </div>
                    <div className={cx(styles.desc, styles.danger)}>
                      {' '}
                      提示：此项需要刷新页面才能生效{' '}
                    </div>
                  </div>
                  <div className={styles.border}>
                    {switchRow('优化首页样式', config.homeTheme, (v) => update({ homeTheme: v }))}
                    <div className={styles.desc}>
                      {' '}
                      调整首页的顶栏、标签、主题列表和右侧栏的配色与卡片样式，仅对首页生效{' '}
                    </div>
                  </div>
                  <div className={styles.border}>
                    {switchRow('主题弹框显示', config.clickPostItemOpenDetail, (v) =>
                      update({ clickPostItemOpenDetail: v }),
                    )}
                    <div className={styles.desc}>
                      {' '}
                      开启此选项后，主题会<span className={styles.danger}>始终</span>
                      以弹框的方式显示。优先级大于“新标签页打开链接”{' '}
                    </div>
                  </div>
                  <div className={styles.border}>
                    {switchRow('新标签页打开链接', config.newTabOpen, (v) =>
                      update({ newTabOpen: v }),
                    )}
                    <div className={styles.desc}> 网页上所有链接通过新标签页打开 </div>
                  </div>
                  {switchRow('打开新标签页时立即切换过去', config.newTabOpenActive, (v) =>
                    update({ newTabOpenActive: v }),
                  )}
                </div>
              )}
              {tabIndex === 1 && (
                <div className={styles.card}>
                  <div className={cx(styles.row, styles.border)}>
                    <label className={styles['item-title']}>回复类型</label>
                    <div className={styles.wrapper}>
                      <BaseSelect
                        displayType={config.commentDisplayType}
                        onUpdateDisplayType={(v) => update({ commentDisplayType: v })}
                      />
                    </div>
                  </div>
                  {switchRow(
                    '详情页中显示“回复类型”',
                    config.showToolbar,
                    (v) => update({ showToolbar: v }),
                    true,
                  )}
                  {switchRow(
                    '替换Imgur源',
                    config.replaceImgur,
                    (v) => update({ replaceImgur: v }),
                    true,
                  )}
                  <div className={styles.border}>
                    {switchRow('单独打开主题时默认显示楼中楼', config.autoOpenDetail, (v) =>
                      update({ autoOpenDetail: v }),
                    )}
                    <div className={styles.desc}>
                      {' '}
                      单独打开这种地址 https://v2ex.com/t/xxxx 时，是否默认显示楼中楼{' '}
                    </div>
                  </div>
                  {switchRow(
                    '点击左右两侧透明处关闭主题详情弹框',
                    config.closePostDetailBySpace,
                    (v) => update({ closePostDetailBySpace: v }),
                    true,
                  )}
                  {switchRow(
                    '正文超长自动折叠',
                    config.contentAutoCollapse,
                    (v) => update({ contentAutoCollapse: v }),
                    true,
                  )}
                  <div className={styles.border}>
                    <div className={styles.row}>
                      <label className={styles['item-title']}>主题宽度</label>
                      <div className={styles.wrapper}>
                        <input
                          type="text"
                          value={config.postWidth}
                          onChange={(e) => update({ postWidth: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className={styles.desc}>
                      {' '}
                      未设定此值时，则默认宽度为77rem。接受合法的width值：{' '}
                      <a
                        style={{ color: 'var(--color-active)', textDecoration: 'underline' }}
                        href="https://vue3js.cn/interview/css/em_px_rem_vh_vw.html#%E4%BA%8C%E3%80%81%E5%8D%95%E4%BD%8D"
                        target="_blank"
                        rel="noreferrer"
                      >
                        rem、px、vw、vh(点此查看)
                      </a>
                      。 vw代表屏幕百分比，如想要屏幕的66%，请填写66vw{' '}
                    </div>
                    <div className={styles.desc}>
                      {' '}
                      提示：此项设置以后，单独打开详情页时会出现主题突然变宽（窄）的问题，暂时无解{' '}
                    </div>
                    <div className={cx(styles.desc, styles.danger)}>
                      {' '}
                      提示：此项需要刷新页面才能生效{' '}
                    </div>
                  </div>
                  <div className={styles.row}>
                    <label className={styles['main-title']}>高赞回复</label>
                  </div>
                  {switchRow(
                    '显示高赞回复',
                    config.showTopReply,
                    (v) => update({ showTopReply: v }),
                    true,
                  )}
                  <div className={cx(styles.row, styles.border)}>
                    <label className={styles['item-title']}>
                      最多显示{config.topReplyCount}个高赞回复
                    </label>
                    <div className={styles.wrapper}>
                      <input
                        type="number"
                        min="1"
                        value={config.topReplyCount}
                        onChange={numberInput('topReplyCount')}
                      />
                    </div>
                  </div>
                  <div className={cx(styles.row, styles.border)}>
                    <label className={styles['item-title']}>
                      最少需要{config.topReplyLoveMinCount}个赞才能被判定为高赞
                    </label>
                    <div className={styles.wrapper}>
                      <input
                        type="number"
                        min="1"
                        value={config.topReplyLoveMinCount}
                        onChange={numberInput('topReplyLoveMinCount')}
                      />
                    </div>
                  </div>
                </div>
              )}
              {tabIndex === 2 && (
                <div className={styles.card}>
                  <div className={styles.row}>
                    <label className={styles['main-title']}>收藏列表</label>
                  </div>
                  <div className={styles.border}>
                    <div className={styles.row}>
                      <div>
                        <BaseButton onClick={exportCollectList} loading={exportLoading}>
                          导出
                        </BaseButton>
                        <span>{'\u00a0\u00a0\u00a0'}</span>
                        <div
                          style={{
                            display: 'inline-flex',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <BaseButton loading={importLoading}>导入，并收藏</BaseButton>
                          {showInput && (
                            <input
                              type="file"
                              style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100px',
                                opacity: 0,
                              }}
                              onChange={importCollectList}
                            />
                          )}
                        </div>
                        {importLoading && (
                          <div
                            style={{
                              display: 'inline',
                              marginLeft: '10px',
                              fontSize: '13px',
                              color: 'var(--color-font)',
                            }}
                          >
                            {' '}
                            导入中：{index}/{total} ，大约需要{endTime}
                            分钟，导入完成前请勿关闭和刷新本页面{' '}
                          </div>
                        )}
                        {importOk && (
                          <div style={{ display: 'inline', marginLeft: '10px' }}> 导入完成 </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.desc}>
                      {' '}
                      默认导出为 json 文件，如需其他格式，请使用 ChatGpt/Deepseek 转换{' '}
                    </div>
                  </div>
                  {switchRow('收藏时提醒添加到书签', config.collectBrowserNotice, (v) =>
                    update({ collectBrowserNotice: v }),
                  )}
                  <div className={styles.desc}>
                    {' '}
                    解释：V站帐号一旦被封禁，则无法登录，无法查看账号收藏了{' '}
                  </div>
                  <div className={cx(styles.row, styles.border)}>
                    <label className={styles['main-title']}>其他</label>
                  </div>
                  {switchRow(
                    '用户打标签(跨平台，数据保存在自己的记事本)：',
                    config.openTag,
                    (v) => update({ openTag: v }),
                    true,
                  )}
                  {switchRow('划词显示Base64解码框', config.base64, (v) => update({ base64: v }))}
                  {switchRow('自动签到', config.autoSignin, (v) => update({ autoSignin: v }), true)}
                  <div className={styles.border}>
                    <div className={styles.row}>
                      <label className={styles['item-title']}>自定义背景</label>
                      <div className={styles.wrapper}>
                        <input
                          type="text"
                          value={config.customBgColor}
                          onChange={(e) => update({ customBgColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className={styles.desc}>
                      {' '}
                      未设定此值时，则脚本就什么都不做，V站大部分页面背景颜色默认为
                      #e2e2e2，少部分页面有特定背景。接受一个合法的css color值：例如
                      <a
                        href="https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value"
                        target="_blank"
                        rel="noreferrer"
                      >
                        red、#ffffff、rgb(222,222,22)(点此查看)
                      </a>
                      等等。{' '}
                    </div>
                    <div className={cx(styles.desc, styles.danger)}>
                      {' '}
                      提示：此项需要刷新页面才能生效{' '}
                    </div>
                  </div>
                  <div className={styles.row}>
                    <label className={styles['main-title']}>消息通知</label>
                  </div>
                  {switchRow(
                    '接管未读提醒页面',
                    config.notice.takeOverNoticePage,
                    (v) => updateNotice({ takeOverNoticePage: v }),
                    true,
                  )}
                  {switchRow('定时查询未读提醒', config.notice.loopCheckNotice, (v) =>
                    updateNotice({ loopCheckNotice: v }),
                  )}
                  <div className={styles.desc}>
                    {' '}
                    开启此功能会带来以下影响： 1、你的IP可能会被封禁
                    2、消耗更多流量，给服务器带来更大的负担 3、你的V站浏览进度条会变快{' '}
                  </div>
                  {config.notice.loopCheckNotice && (
                    <div className={styles['sub-content']}>
                      <div className={styles.row}>
                        <label className={styles['item-title']}>查询间隔</label>
                        <div className={styles.wrapper}>
                          <BlurInput
                            key={String(config.notice.loopCheckNoticeInterval)}
                            type="number"
                            value={config.notice.loopCheckNoticeInterval}
                            onCommit={(v) => updateNotice({ loopCheckNoticeInterval: Number(v) })}
                            style={{ marginRight: '1rem' }}
                          />
                          分钟{' '}
                        </div>
                      </div>
                      <div className={styles.desc}>
                        {' '}
                        设置值太小，会导致频繁请求，你的IP可能会被封禁，建议设置为5，即每次5分钟查询一次{' '}
                      </div>
                      {switchRow(
                        '当有新未读提醒时，网页标题闪烁',
                        config.notice.whenNewNoticeGlimmer,
                        (v) => updateNotice({ whenNewNoticeGlimmer: v }),
                      )}
                      <div className={styles.row}>
                        <label className={styles['item-title']}>钉钉Webhook地址</label>
                      </div>
                      <div className={styles.desc}>
                        <BlurInput
                          key={config.notice.ddWebhook}
                          type="text"
                          value={config.notice.ddWebhook}
                          onCommit={(v) => updateNotice({ ddWebhook: v })}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  )}
                  <div className={cx(styles.desc, styles.danger)}>
                    {' '}
                    提示：此项需要刷新页面才能生效{' '}
                  </div>
                </div>
              )}
              {tabIndex === 3 && <ImageRules />}
              {tabIndex === 4 && (
                <div className={styles.card}>
                  <h1>V2EX Enhancement</h1>
                  <div className={styles['project-desc']}>
                    <div style={{ lineHeight: 2 }}>
                      {(
                        [
                          ['GitHub地址：', DefaultVal.git],
                          ['反馈: ', DefaultVal.issue],
                          ['更新日志：', DefaultVal.releases],
                          ['基于：', DefaultVal.upstream],
                        ] as const
                      ).map(([label, url]) => (
                        <div key={label}>
                          {label}
                          <a href={url} target="_blank" rel="noreferrer">
                            {url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.tips2}>
                    <Icon icon="icon-park-outline:tips" />
                    <span>
                      代码完全开源，基于 V2Next（GPL）还原为 React + TypeScript，不放心也可自行打包~
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
