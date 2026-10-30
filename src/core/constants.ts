import type { Config, Post, UserData } from './types';
import { CommentDisplayType } from './types';

export interface EmojiGroup {
  title: string;
  list: string[];
}

export interface ClassicEmoticon {
  name: string;
  low: string;
  high: string;
}

const clone = <T>(val: T): T => JSON.parse(JSON.stringify(val)) as T;

export const DefaultVal = {
  pageType: undefined,
  pageData: { pageNo: 1 },
  targetUserName: '',
  currentVersion: 5,
  cb: null,
  git: 'https://github.com/Yofun/v2ex-enhancement',
  shortGit: 'Yofun/v2ex-enhancement',
  issue: 'https://github.com/Yofun/v2ex-enhancement/issues',
  releases: 'https://github.com/Yofun/v2ex-enhancement/releases',
  upstream: 'https://github.com/zyronon/V2Next',
  hotUrl: 'https://v2hotlist.vercel.app/hot/',
  imgurProxy: 'https://img.noobzone.ru/getimg.php?url=',
};

export const DefaultPost: Post = {
  allReplyUsers: [],
  content_rendered: '',
  createDate: '',
  createDateAgo: '',
  lastReplyDate: '',
  lastReplyUsername: '',
  fr: '',
  replyList: [],
  topReplyList: [],
  nestedReplies: [],
  nestedRedundReplies: [],
  username: '',
  url: '',
  href: '',
  member: {
    avatar: '',
    username: '',
  },
  node: {
    title: '',
    url: '',
  },
  headerTemplate: '',
  title: '',
  id: '',
  type: 'post',
  once: '',
  replyCount: 0,
  clickCount: 0,
  thankCount: 0,
  collectCount: 0,
  lastReadFloor: 0,
  isFavorite: false,
  isIgnore: false,
  isThanked: false,
  isReport: false,
  inList: false,
};

export const getDefaultPost = (val: Partial<Post> = {}): Post =>
  Object.assign(clone(DefaultPost), val);

export const DefaultUser: UserData = {
  tagPrefix: '--用户标签--',
  tags: {},
  tagsId: '',
  username: '',
  avatar: '',
  readPrefix: '--已读楼层--',
  readNoteItemId: '',
  readList: {},
  imgurPrefix: '--imgur图片删除hash--',
  imgurList: {},
  imgurNoteId: '',
  configPrefix: '--config--',
  configNoteId: '',
};

export function getDefaultConfig(val: Partial<Config> = {}): Config {
  return Object.assign(
    {
      showToolbar: true,
      autoOpenDetail: true,
      // 给用户打标签
      openTag: false,
      clickPostItemOpenDetail: true,
      // 点击空白处关闭详情
      closePostDetailBySpace: true,
      // 正文超长自动折叠
      contentAutoCollapse: true,
      viewType: 'table',
      commentDisplayType: CommentDisplayType.FloorInFloorNoCallUser,
      // 新标签打开
      newTabOpen: false,
      newTabOpenActive: false,
      // base功能
      base64: true,
      sov2ex: false,
      postWidth: '',
      showTopReply: true,
      topReplyLoveMinCount: 3,
      topReplyCount: 5,
      autoJumpLastReadFloor: false,
      rememberLastReadFloor: false,
      autoSignin: true,
      customBgColor: '',
      version: DefaultVal.currentVersion,
      collectBrowserNotice: false,
      fontSizeType: 'normal',
      detailTheme: 'default',
      notice: {
        uid: '',
        text: '',
        ddWebhook: '',
        takeOverNoticePage: true,
        whenNewNoticeGlimmer: false,
        loopCheckNotice: false,
        loopCheckNoticeInterval: 5,
      },
      replaceImgur: false,
      maxReplyCountLimit: 400,
    } satisfies Config,
    val,
  );
}

export const emojiEmoticons: EmojiGroup[] = [
  {
    title: '常用',
    list: [
      '😅',
      '😭',
      '😂',
      '🥰',
      '😰',
      '🤡',
      '👀',
      '🐴',
      '🐶',
      '❓',
      '❤️',
      '💔',
      '⭐',
      '🔥',
      '💩',
      '🔞',
      '⚠️',
      '🎁',
      '🎉',
    ],
  },
  {
    title: '小黄脸',
    list: [
      '😀',
      '😁',
      '😂',
      '🤣',
      '😅',
      '😊',
      '😋',
      '😘',
      '🥰',
      '😗',
      '🤩',
      '🤔',
      '🤨',
      '😐',
      '😑',
      '🙄',
      '😏',
      '😪',
      '😫',
      '🥱',
      '😜',
      '😒',
      '😔',
      '😨',
      '😰',
      '😱',
      '🥵',
      '😡',
      '🥳',
      '🥺',
      '🤭',
      '🧐',
      '😎',
      '🤓',
      '😭',
      '🤑',
      '🤮',
    ],
  },
  {
    title: '手势',
    list: ['🤏', '👉', '✌️', '👌', '👍', '👎', '🤝', '🙏', '👏'],
  },
  {
    title: '其他',
    list: ['🔞', '👻', '🤡', '🐔', '👀', '💩', '🐴', '🦄', '🐧', '🐶'],
  },
];

export const classicsEmoticons: ClassicEmoticon[] = [
  {
    name: '[狗头]',
    low: 'https://i.imgur.com/io2SM1h.png',
    high: 'https://i.imgur.com/0icl60r.png',
  },
  {
    name: '[doge]',
    low: 'https://i.imgur.com/duWRpIu.png',
    high: 'https://i.imgur.com/HyphI6d.png',
  },
  {
    name: '[受虐滑稽]',
    low: 'https://i.imgur.com/Iy0taMy.png',
    high: 'https://i.imgur.com/PS1pxd9.png',
  },
  {
    name: '[马]',
    low: 'https://i.imgur.com/8EKZv7I.png',
    high: 'https://i.imgur.com/ANFUX52.png',
  },
  {
    name: '[二哈]',
    low: 'https://i.imgur.com/XKj1Tkx.png',
    high: 'https://i.imgur.com/dOeP4XD.png',
  },
  {
    name: '[舔屏]',
    low: 'https://i.imgur.com/Cvl7dyN.png',
    high: 'https://i.imgur.com/LmETy9N.png',
  },
  {
    name: '[辣眼睛]',
    low: 'https://i.imgur.com/cPNPYD5.png',
    high: 'https://i.imgur.com/3fSUmi8.png',
  },
  {
    name: '[吃瓜]',
    low: 'https://i.imgur.com/ee8Lq7H.png',
    high: 'https://i.imgur.com/0L26og9.png',
  },
  {
    name: '[不高兴]',
    low: 'https://i.imgur.com/huX6coX.png',
    high: 'https://i.imgur.com/N7JEuvc.png',
  },
  {
    name: '[真棒]',
    low: 'https://i.imgur.com/xr1UOz1.png',
    high: 'https://i.imgur.com/w8YEw9Q.png',
  },
  {
    name: '[鄙视]',
    low: 'https://i.imgur.com/u6jlqVq.png',
    high: 'https://i.imgur.com/8JFNANq.png',
  },
  {
    name: '[疑问]',
    low: 'https://i.imgur.com/F29pmQ6.png',
    high: 'https://i.imgur.com/EbbTQAR.png',
  },
  {
    name: '[吐舌]',
    low: 'https://i.imgur.com/InmIzl9.png',
    high: 'https://i.imgur.com/Ovj56Cd.png',
  },
  {
    name: '[笑眼]',
    low: 'https://i.imgur.com/ZveiiGy.png',
    high: 'https://i.imgur.com/PI1CfEr.png',
  },
  {
    name: '[大哭]',
    low: 'https://i.imgur.com/hu4oR6C.png',
    high: 'https://i.imgur.com/b4X9XLE.png',
  },
  {
    name: '[喷]',
    low: 'https://i.imgur.com/bkw3VRr.png',
    high: 'https://i.imgur.com/wnZL13L.png',
  },
  {
    name: '[苦笑]',
    low: 'https://i.imgur.com/VUWFktU.png',
    high: 'https://i.imgur.com/NAfspZ1.png',
  },
  {
    name: '[喝酒]',
    low: 'https://i.imgur.com/2ZZSapE.png',
    high: 'https://i.imgur.com/rVbSVak.png',
  },
  {
    name: '[捂脸]',
    low: 'https://i.imgur.com/krir4IG.png',
    high: 'https://i.imgur.com/qqBqgVm.png',
  },
  {
    name: '[阴险]',
    low: 'https://i.imgur.com/MA8YqTP.png',
    high: 'https://i.imgur.com/e94jbaT.png',
  },
  {
    name: '[怒]',
    low: 'https://i.imgur.com/n4kWfGB.png',
    high: 'https://i.imgur.com/iMXxNxh.png',
  },
];
