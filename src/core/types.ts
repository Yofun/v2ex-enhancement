export enum PageType {
  Home = 'Home',
  Node = 'Node',
  Post = 'Post',
  Member = 'Member',
  Changes = 'Changes',
  Hot = 'Hot',
}

export enum CommentDisplayType {
  FloorInFloor = 0,
  Like = 1,
  V2exOrigin = 2,
  OnlyOp = 3,
  FloorInFloorNoCallUser = 4,
  FloorInFloorNested = 5,
  New = 6,
}

export type ViewType = 'table' | 'card' | 'simple';
export type FontSizeType = 'small' | 'normal' | 'large' | string;

export interface Member {
  id?: number;
  username: string;
  avatar?: string;
  avatar_large?: string;
  avatar_normal?: string;
  avatar_mini?: string;
  created?: number;
  /** 解析后的注册日期文案，如 "2020-1-1 注册" */
  createDate?: string;
  isNew?: boolean;
  [key: string]: unknown;
}

export interface Reply {
  id: string;
  floor: number;
  level: number;
  username: string;
  avatar: string;
  date: string;
  reply_content: string;
  reply_text: string;
  /** 单一 @ 用户时去掉 @xxx #n 前缀后的内容 */
  hideCallUserReplyContent: string;
  replyUsers: string[];
  /** 回复的楼层，未指定为 -1 */
  replyFloor: number;
  thankCount: number;
  isThanked: boolean;
  isOp: boolean;
  isMod?: boolean;
  isDup: boolean;
  /** 构建嵌套树时的临时标记 */
  isUse?: boolean;
  isWrong?: boolean;
  replyCount: number;
  children: Reply[];
}

export interface Post {
  id: string;
  type: 'post';
  title: string;
  href: string;
  url: string;
  once: string;
  username: string;
  content_rendered: string;
  headerTemplate: string;
  createDate: string;
  createDateAgo: string;
  lastReplyDate: string;
  lastReplyUsername: string;
  /** 回复区右上角分页等 HTML */
  fr: string;
  member: Member;
  node: { title: string; url: string; [key: string]: unknown };
  replyList: Reply[];
  topReplyList: Reply[];
  nestedReplies: Reply[];
  nestedRedundReplies: Reply[];
  allReplyUsers: string[];
  replyCount: number;
  clickCount: number;
  thankCount: number;
  collectCount: number;
  lastReadFloor: number;
  isFavorite: boolean;
  isIgnore: boolean;
  isThanked: boolean;
  isReport: boolean;
  inList: boolean;
  created?: number;
  [key: string]: unknown;
}

export interface NoticeConfig {
  uid: string;
  text: string;
  ddWebhook: string;
  takeOverNoticePage: boolean;
  whenNewNoticeGlimmer: boolean;
  loopCheckNotice: boolean;
  loopCheckNoticeInterval: number;
}

export interface Config {
  showToolbar: boolean;
  autoOpenDetail: boolean;
  openTag: boolean;
  clickPostItemOpenDetail: boolean;
  closePostDetailBySpace: boolean;
  contentAutoCollapse: boolean;
  viewType: ViewType;
  commentDisplayType: CommentDisplayType;
  newTabOpen: boolean;
  newTabOpenActive: boolean;
  base64: boolean;
  sov2ex: boolean;
  postWidth: string;
  showTopReply: boolean;
  topReplyLoveMinCount: number;
  topReplyCount: number;
  autoJumpLastReadFloor: boolean;
  rememberLastReadFloor: boolean;
  autoSignin: boolean;
  customBgColor: string;
  version: number;
  collectBrowserNotice: boolean;
  fontSizeType: FontSizeType;
  detailTheme: 'default' | 'mecha';
  notice: NoticeConfig;
  replaceImgur: boolean;
  maxReplyCountLimit: number;
}

/** 当前登录用户及其存放在 V2EX 记事本里的数据 */
export interface UserData {
  tagPrefix: string;
  tags: Record<string, string[]>;
  tagsId: string;
  username: string;
  avatar: string;
  readPrefix: string;
  readNoteItemId: string;
  readList: Record<string, number>;
  imgurPrefix: string;
  imgurList: Record<string, unknown>;
  imgurNoteId: string;
  configPrefix: string;
  configNoteId: string;
}
