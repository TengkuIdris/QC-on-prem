import React, { useRef, useState } from "react";
import { Typography, Box, TextField, Button } from "@mui/material";
import { Send } from "@mui/icons-material";
import event from "@/utils/eventEmitter";
import { EventChatType } from "@/constant/enum";
import { StyledPaper } from "../../../utils/styledComponents";
import MessageBox from "../MessageBox";
import { Field, useFormikContext } from "formik";

export interface ChatUIProps {
  setQueryIds: React.Dispatch<React.SetStateAction<number[]>>;
  diagrams: string;
  open: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatUI: React.FC<ChatUIProps> = ({ setQueryIds, diagrams, open, setOpen }) => {
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [disableButton, setDisableButton] = useState<boolean>(false);
  const formik = useFormikContext<{
    title: string;
    new_message: string;
  }>();
  const handleSendMessage = () => {
    setDisableButton(true);
    event.emit(EventChatType.LAST_SNAPSHOT_MESSAGE, {
      value: formik?.values?.new_message,
      diagrams: diagrams,
    });
    formik.setFieldValue("new_message", "");
  };

  const handleOnscrollMessageBox = () => {
    if (chatBoxRef.current?.scrollTop === 0) {
      event.emit(EventChatType.LOAD_MORE_MESSAGES, chatBoxRef.current?.scrollHeight as number);
    }
  };

  return (
    <>
      <StyledPaper elevation={3}>
        <Typography
          variant="h5"
          gutterBottom
        >
          AI Assistant Chat
        </Typography>
        <Box
          data-testid="scroll-container"
          flexGrow={1}
          overflow="auto"
          mb={2}
          p={2}
          border={1}
          borderColor="divider"
          borderRadius={1}
          className="max-h-[calc(100vh-120px)] c_scrollbar_out custom-scrollbar !p-[0px] !px-[2px] !py-1"
        >
          <div
            ref={chatBoxRef}
            className="p_chat__tab1 c_message__scroll c_scrollbar custom-scrollbar"
            onScroll={handleOnscrollMessageBox}
          >
            <MessageBox
              setDisableButton={setDisableButton}
              setQueryIds={setQueryIds}
              open={open}
            />
          </div>
        </Box>
        <Box display="flex">
          <Field
            name="new_message"
            as={TextField}
            fullWidth
            placeholder="メッセージ入力..."
            variant="outlined"
            size="small"
            className="text-[11px]"
          />
          <Button
            type="button"
            color="primary"
            onClick={handleSendMessage}
            disabled={disableButton}
          >
            <Send />
          </Button>
        </Box>
      </StyledPaper>
    </>
  );
};

export default ChatUI;
