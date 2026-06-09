import React, { FC } from "react";
import { useState } from "react";
import { formatTimeToNow } from "../utils/formatTime";
import event from "@/utils/eventEmitter";
import { EventChatType } from "@/constant/enum";

export enum Sender {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

export const trimBreakLineText = "!==*=%%VM";

interface MessageItemProps {
  problem: string | null;
  senderType: Sender;
  createdAt: Date | null;
  diagrams: string | null;
  responseDiagram?: string | undefined;
  loadingMessageAi?: boolean;
}

const MessageItem: FC<MessageItemProps> = ({
  problem,
  senderType,
  createdAt,
  diagrams,
  responseDiagram,
  loadingMessageAi = true,
}) => {
  const [isOpenTime, setIsOpenTime] = useState(false);

  const handleGenerateChart = () => {
    event.emit(EventChatType.GENERATE_CHART, responseDiagram);
  };

  return (
    <div className={`flex mb-5 ${senderType === Sender.ASSISTANT ? "left" : "flex-row-reverse"}`}>
      <div
        data-testid="avatar-container"
        className={`w-[30px] h-[30px] rounded-full overflow-hidden bg-gray-300 ${senderType === Sender.ASSISTANT ? "mr-2" : "ml-2"} inline-block align-middle`}
      >
        <div
          data-testid="avatar-inner"
          className={`w-[30px] h-[30px] object-cover flex justify-center items-center ${senderType === Sender.ASSISTANT ? "bg-[#C8D4DB]" : "bg-[#F4ABB4]"}  text-[rgb(255,255,255)] text-[10px]`}
        >
          {senderType === Sender.ASSISTANT ? "AI" : "AD"}
        </div>
      </div>
      <div
        className="leading-6 relative max-w-[80%]"
        onClick={() => setIsOpenTime((prev) => !prev)}
      >
        <div
          className={`${senderType === Sender.ASSISTANT ? "rounded-tl-none rounded-tr-[18px] rounded-br-[18px] rounded-bl-[18px]" : "rounded-tr-none rounded-tl-[18px] rounded-br-[18px] rounded-bl-[18px]"} bg-[#ECEDEE] p-3 px-4 w-full`}
        >
          <div
            className="inner text-[11px] break-words"
            dangerouslySetInnerHTML={{
              __html:
                senderType === Sender.ASSISTANT
                  ? diagrams
                    ? diagrams
                    : "ネットワーク接続が失われました。もう一度実行してください。"
                  : problem!,
            }}
          />
          {senderType === Sender.ASSISTANT && loadingMessageAi && diagrams && (
            <p
              className="mt-2 text-[#1d92eb] text-[11px] cursor-pointer hover:underline"
              onClick={handleGenerateChart}
            >
              特性要因図に反映
            </p>
          )}
        </div>
        {isOpenTime && createdAt && (
          <div className="text-[10px] text-[#9DA2A7]">
            <span>{formatTimeToNow(createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
