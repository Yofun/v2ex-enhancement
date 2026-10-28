/* eslint-disable */
// @ts-nocheck
// 原脚本 V2Next 10.31 第 191-332 行（findChildren / createNestedList / createNestedRedundantList），逐字拷贝，作为重构后算法的对照基准
export const oracle: Record<string, (...args: any[]) => any> = {
  clone: (val) => JSON.parse(JSON.stringify(val)),
  findChildren(item, endList, all, topReplyList) {
    var _a;
    const fn = (child, endList2, parent) => {
      child.level = parent.level + 1;
      let rIndex2 = all.findIndex((v) => v.floor === child.floor);
      if (rIndex2 > -1) {
        all[rIndex2].isUse = true;
      }
      parent.children.push(this.findChildren(child, endList2, all, topReplyList));
    };
    item.children = [];
    let floorReplyList = [];
    for (let i = 0; i < endList.length; i++) {
      let currentItem = endList[i];
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
    floorReplyList.reverse().map(({ currentItem, endList: endList2 }) => {
      fn(currentItem, endList2, item);
    });
    let nextMeIndex = endList.findIndex((v) => {
      var _a2;
      return (
        v.username === item.username &&
        ((_a2 = v.replyUsers) == null ? void 0 : _a2[0]) !== item.username
      );
    });
    let findList = nextMeIndex > -1 ? endList.slice(0, nextMeIndex) : endList;
    for (let i = 0; i < findList.length; i++) {
      let currentItem = findList[i];
      if (currentItem.isUse) continue;
      if (currentItem.replyUsers.length === 1) {
        if (currentItem.replyFloor !== -1) {
          if (
            ((_a = all[currentItem.replyFloor - 1]) == null ? void 0 : _a.username) ===
            currentItem.replyUsers[0]
          ) {
            continue;
          }
        }
        let endList2 = endList.slice(i + 1);
        if (currentItem.username === item.username) {
          if (currentItem.replyUsers[0] === item.username) {
            fn(currentItem, endList2, item);
          }
          break;
        } else {
          if (currentItem.replyUsers[0] === item.username) {
            fn(currentItem, endList2, item);
          }
        }
      } else {
        if (currentItem.username === item.username) break;
      }
    }
    item.children = item.children.sort((a, b) => a.floor - b.floor);
    item.replyCount = item.children.reduce((a, b) => {
      return a + (b.children.length ? b.replyCount + 1 : 1);
    }, 0);
    let rIndex = topReplyList.findIndex((v) => v.floor === item.floor);
    if (rIndex > -1) {
      topReplyList[rIndex].children = item.children;
      topReplyList[rIndex].replyCount = item.replyCount;
    }
    return item;
  },
  //生成嵌套回复
  createNestedList(allList = [], topReplyList = []) {
    if (!allList.length) return [];
    let list = allList;
    let nestedList = [];
    list.map((item, index) => {
      let startList = list.slice(0, index);
      let startReplyUsers = Array.from(new Set(startList.map((v) => v.username)));
      let endList = list.slice(index + 1);
      if (index === 0) {
        nestedList.push(this.findChildren(item, endList, list, topReplyList));
      } else {
        if (!item.isUse) {
          let isOneLevelReply = false;
          if (item.replyUsers.length) {
            if (item.replyUsers.length > 1) {
              isOneLevelReply = true;
            } else {
              isOneLevelReply = !startReplyUsers.find((v) => v === item.replyUsers[0]);
            }
          } else {
            isOneLevelReply = true;
          }
          if (isOneLevelReply) {
            item.level = 0;
            nestedList.push(this.findChildren(item, endList, list, topReplyList));
          }
        }
      }
    });
    return nestedList;
  },
  //生成嵌套冗余回复
  createNestedRedundantList(allList = [], topReplyList) {
    if (!allList.length) return [];
    let list = allList;
    let nestedList = [];
    list.map((item, index) => {
      let startList = list.slice(0, index);
      let startReplyUsers = Array.from(new Set(startList.map((v) => v.username)));
      let endList = list.slice(index + 1);
      if (index === 0) {
        nestedList.push(this.findChildren(item, endList, list, topReplyList));
      } else {
        if (!item.isUse) {
          let isOneLevelReply = false;
          if (item.replyUsers.length) {
            if (item.replyUsers.length > 1) {
              isOneLevelReply = true;
            } else {
              isOneLevelReply = !startReplyUsers.find((v) => v === item.replyUsers[0]);
            }
          } else {
            isOneLevelReply = true;
          }
          if (isOneLevelReply) {
            item.level = 0;
            nestedList.push(this.findChildren(item, endList, list, topReplyList));
          }
        } else {
          let newItem = this.clone(item);
          newItem.children = [];
          newItem.level = 0;
          newItem.isDup = true;
          nestedList.push(newItem);
        }
      }
    });
    return nestedList;
  },
};
