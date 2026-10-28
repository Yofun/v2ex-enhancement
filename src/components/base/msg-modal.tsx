import { useEffect, useState } from 'react';

import { CMD, eventBus } from '@/core/event-bus';

import { Msg } from './msg';
import styles from './msg-modal.module.scss';

interface MsgItem {
  type?: string;
  text?: string;
  id: number;
}

let seq = 0;

export function MsgModal() {
  const [msgList, setMsgList] = useState<MsgItem[]>([]);

  useEffect(() => {
    const onShowMsg = (val?: Omit<MsgItem, 'id'>) => {
      setMsgList((list) => [...list, { ...val, id: ++seq }]);
    };
    eventBus.on(CMD.SHOW_MSG, onShowMsg);
    return () => eventBus.offOne(CMD.SHOW_MSG, onShowMsg);
  }, []);

  const removeMsg = (id: number) => {
    setMsgList((list) => list.filter((item) => item.id !== id));
  };

  return (
    <div className={styles.msgs}>
      {msgList.map((v) => (
        <Msg key={v.id} type={v.type} text={v.text} onClose={() => removeMsg(v.id)} />
      ))}
    </div>
  );
}
