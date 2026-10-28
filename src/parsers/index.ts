import { createNoteItem, editNoteItem, saveImgurList, saveTags } from './notes';
import {
  fetchPostOtherPageReplies,
  getPostAllReplies,
  getPostDetail,
  parseOp,
  parsePageReplies,
  parsePostContent,
  parseReplyContent,
} from './post';
import { parsePagePostList } from './post-list';

export { findReplyBox } from './post';

export const parse = {
  parsePostContent,
  parseOp,
  getPostAllReplies,
  fetchPostOtherPageReplies,
  parsePageReplies,
  parseReplyContent,
  getPostDetail,
  parsePagePostList,
  createNoteItem,
  editNoteItem,
  saveTags,
  saveImgurList,
};
