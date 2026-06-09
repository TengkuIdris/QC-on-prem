import { FC } from "react";
import React from "react";
import LoadMoreMessages from "../LoadMoreMessage";
import RealTimeMessages from "../RealTimeMessage";
import chatService from "@/services/apis/chatService";
import { useSearchParams } from "react-router-dom";

export interface MessageContent {
  setDisableButton: React.Dispatch<React.SetStateAction<boolean>>;
  setQueryIds: React.Dispatch<React.SetStateAction<number[]>>;
  open: boolean;
}

const MessageBox: FC<MessageContent> = ({ setDisableButton, setQueryIds, open }) => {
  const [search] = useSearchParams();
  return (
    <div>
      <LoadMoreMessages
        loadMore={async (params: any) =>
          search.get("id") && (await chatService.getListMessage(search.get("id")!, params))
        }
        setQueryIds={setQueryIds}
        setDisableButton={setDisableButton}
        open={open}
        id={search.get("id")}
      />
      <RealTimeMessages
        setDisableButton={setDisableButton}
        setQueryIds={setQueryIds}
        id={search.get("id")}
      />
    </div>
  );
};
export default MessageBox;
