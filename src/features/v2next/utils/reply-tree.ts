import type { Reply } from '../types';

const clone = <T>(val: T): T => JSON.parse(JSON.stringify(val)) as T;

/** 查找 item 的子回复（楼中楼），算法与原脚本一致 */
export function findChildren(
  item: Reply,
  endList: Reply[],
  all: Reply[],
  topReplyList: Reply[],
): Reply {
  const attach = (child: Reply, childEndList: Reply[], parent: Reply): void => {
    child.level = parent.level + 1;
    const rIndex = all.findIndex((v) => v.floor === child.floor);
    if (rIndex > -1) {
      all[rIndex].isUse = true;
    }
    parent.children.push(findChildren(child, childEndList, all, topReplyList));
  };

  item.children = [];
  const floorReplyList: { endList: Reply[]; currentItem: Reply }[] = [];
  for (let i = 0; i < endList.length; i++) {
    const currentItem = endList[i];
    if (currentItem.isUse) continue;
    if (currentItem.replyFloor === item.floor) {
      if (currentItem.replyUsers.length === 1 && currentItem.replyUsers[0] === item.username) {
        currentItem.isUse = true;
        floorReplyList.push({ endList: endList.slice(i + 1), currentItem });
      } else {
        currentItem.isWrong = true;
      }
    }
  }
  floorReplyList.reverse().forEach(({ currentItem, endList: childEndList }) => {
    attach(currentItem, childEndList, item);
  });

  const nextMeIndex = endList.findIndex(
    (v) => v.username === item.username && v.replyUsers?.[0] !== item.username,
  );
  const findList = nextMeIndex > -1 ? endList.slice(0, nextMeIndex) : endList;
  for (let i = 0; i < findList.length; i++) {
    const currentItem = findList[i];
    if (currentItem.isUse) continue;
    if (currentItem.replyUsers.length === 1) {
      if (currentItem.replyFloor !== -1) {
        if (all[currentItem.replyFloor - 1]?.username === currentItem.replyUsers[0]) {
          continue;
        }
      }
      const childEndList = endList.slice(i + 1);
      if (currentItem.username === item.username) {
        if (currentItem.replyUsers[0] === item.username) {
          attach(currentItem, childEndList, item);
        }
        break;
      } else if (currentItem.replyUsers[0] === item.username) {
        attach(currentItem, childEndList, item);
      }
    } else if (currentItem.username === item.username) {
      break;
    }
  }

  item.children = item.children.sort((a, b) => a.floor - b.floor);
  item.replyCount = item.children.reduce(
    (a, b) => a + (b.children.length ? b.replyCount + 1 : 1),
    0,
  );
  const rIndex = topReplyList.findIndex((v) => v.floor === item.floor);
  if (rIndex > -1) {
    topReplyList[rIndex].children = item.children;
    topReplyList[rIndex].replyCount = item.replyCount;
  }
  return item;
}

function buildNestedList(list: Reply[], topReplyList: Reply[], withDup: boolean): Reply[] {
  if (!list.length) return [];
  const nestedList: Reply[] = [];
  list.forEach((item, index) => {
    const startReplyUsers = new Set(list.slice(0, index).map((v) => v.username));
    const endList = list.slice(index + 1);
    if (index === 0) {
      nestedList.push(findChildren(item, endList, list, topReplyList));
    } else if (!item.isUse) {
      let isOneLevelReply: boolean;
      if (item.replyUsers.length) {
        isOneLevelReply = item.replyUsers.length > 1 || !startReplyUsers.has(item.replyUsers[0]);
      } else {
        isOneLevelReply = true;
      }
      if (isOneLevelReply) {
        item.level = 0;
        nestedList.push(findChildren(item, endList, list, topReplyList));
      }
    } else if (withDup) {
      const newItem = clone(item);
      newItem.children = [];
      newItem.level = 0;
      newItem.isDup = true;
      nestedList.push(newItem);
    }
  });
  return nestedList;
}

/** 生成嵌套回复。会就地修改 allList / topReplyList，调用方需先 clone */
export function createNestedList(allList: Reply[] = [], topReplyList: Reply[] = []): Reply[] {
  return buildNestedList(allList, topReplyList, false);
}

/** 生成嵌套冗余回复：已被嵌入别处的回复以 isDup 的形式在顶层再出现一次 */
export function createNestedRedundantList(
  allList: Reply[] = [],
  topReplyList: Reply[] = [],
): Reply[] {
  return buildNestedList(allList, topReplyList, true);
}
