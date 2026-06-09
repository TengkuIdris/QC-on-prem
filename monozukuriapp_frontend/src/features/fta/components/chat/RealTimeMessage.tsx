import { FC, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import event from "@/utils/eventEmitter";
import { EventChatType } from "@/constant/enum";
import MessageItem, { Sender } from "./MessageItem";
import React from "react";
import { scrollToBottom } from "./utils/scrollToBottom";
import chatService, { Message } from "@/services/apis/chatService";
import { handleApi } from "@/utils/handleApi";

interface RealTimeMessagesProps {
  setDisableButton: React.Dispatch<React.SetStateAction<boolean>>;
  setQueryIds: React.Dispatch<React.SetStateAction<number[]>>;
  id: string | null;
}
const RealTimeMessages: FC<RealTimeMessagesProps> = ({ setDisableButton, setQueryIds, id }) => {
  const realTimeMessages = useRef<any[]>([]);
  const [loadingMessageAi, setLoadingMessageAi] = useState<boolean>(false);
  const deferredRealTimeMessages = useDeferredValue(realTimeMessages.current);

  useEffect(() => {
    const handleNewMessage = async (data: any) => {
      setLoadingMessageAi(true);
      realTimeMessages.current = [
        ...realTimeMessages.current,
        {
          problem: data.value,
          senderType: Sender.USER,
          createdAt: new Date(Date.now()),
          diagrams: null,
        },
      ];

      const params: Message = id
        ? {
            diagrams: JSON.stringify(data.diagrams),
            problem: data.value,
            fishBoneId: Number(id),
          }
        : {
            diagrams: JSON.stringify(data.diagrams),
            problem: data.value,
          };

      const [res, err] = await handleApi(chatService.postNewMessage(params));

      if (res) {
        realTimeMessages.current = [
          ...realTimeMessages.current,
          {
            problem: null,
            senderType: Sender.ASSISTANT,
            createdAt: new Date(res.data.responseTime),
            diagrams: res.data.diagram,
          },
        ];

        setQueryIds((prev: number[]) => [...prev, ...res.data.queryIds]);
        setDisableButton(false);
        setLoadingMessageAi(false);
      }

      if (err) {
        realTimeMessages.current = [
          ...realTimeMessages.current,
          {
            problem: null,
            senderType: Sender.ASSISTANT,
            createdAt: new Date(Date.now()),
            diagrams: null,
          },
        ];

        setDisableButton(false);
        setLoadingMessageAi(false);
      }
    };
    event.on(EventChatType.LAST_SNAPSHOT_MESSAGE, handleNewMessage);
    return () => {
      event.removeListener(EventChatType.LAST_SNAPSHOT_MESSAGE, handleNewMessage);
    };
  }, []);

  const realTimeMessageComponents = useMemo(() => {
    return (
      <>
        {realTimeMessages.current?.map((d) => (
          <MessageItem
            problem={d.problem}
            senderType={d.senderType}
            createdAt={d.createdAt}
            diagrams={d.diagrams}
            key={Math.random() * 100 * Number(d.createAt)}
            responseDiagram={d.diagrams}
          />
        ))}
        {loadingMessageAi && (
          <MessageItem
            problem={null}
            senderType={Sender.ASSISTANT}
            createdAt={null}
            diagrams="AIが入力中です..."
            loadingMessageAi={false}
            key={Math.random() * 0.1}
          />
        )}
      </>
    );
  }, [deferredRealTimeMessages]);

  useEffect(() => {
    if (realTimeMessages.current.length) {
      scrollToBottom(".p_chat__tab1");
    }
  }, [realTimeMessages.current]);

  return realTimeMessageComponents;
};

export default RealTimeMessages;
