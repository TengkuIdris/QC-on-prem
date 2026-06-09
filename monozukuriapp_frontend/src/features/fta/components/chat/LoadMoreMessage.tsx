/* eslint-disable no-unsafe-optional-chaining */
import { FC, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import event from "@/utils/eventEmitter";
import { handleApi } from "@/utils/handleApi";
import MessageItem, { Sender } from "./MessageItem";
import React from "react";
import { EventChatType } from "@/constant/enum";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";

interface LoadMoreMessagesProps {
  loadMore: (...search: any) => Promise<any>;
  setQueryIds: React.Dispatch<React.SetStateAction<number[]>>;
  setDisableButton: React.Dispatch<React.SetStateAction<boolean>>;
  open: boolean;
  id: string | null;
}

const LoadMoreMessages: FC<LoadMoreMessagesProps> = ({ loadMore, setDisableButton, open, id }) => {
  const [loadMoreMessages, setLoadMoreMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<boolean>(false);
  const lastScrollHeight = useRef<number>(0);
  const deferredLoadMoreMessages = useDeferredValue(loadMoreMessages);
  const loadMoreRef = useRef<{
    shouldWait: boolean;
    page: number;
    totalPage: number;
    search: any;
  }>({
    search: {},
    shouldWait: false,
    page: 1,
    totalPage: 1,
  });
  let pollingInterval: NodeJS.Timeout | null = null;

  const handleGetAndUpdateMessage = async () => {
    setLoading(true);
    const [res] = await handleApi(loadMore({ page: loadMoreRef.current.page, ...loadMoreRef.current.search }));
    if (Array.isArray(res?.data.data) && res.data?.data?.length) {
      setLoadMoreMessages((prev: any) => [...res.data?.data.slice().reverse(), ...prev]);
      loadMoreRef.current.totalPage = res.data.totalPage;

      if (res.data.data[0].senderType === Sender.USER && loadMoreRef.current.page === 1 && id) {
        setDisableButton(true);
        setLoadingMessage(true);
        pollingInterval = setInterval(async () => {
          try {
            const [response] = await handleApi(loadMore({ page: 1 }));
            if (response.data.data[0].senderType === Sender.ASSISTANT) {
              setLoadingMessage(false);
              setDisableButton(false);
              setLoadMoreMessages((prev: any) => [...prev, response.data.data[0]]);
              clearInterval(pollingInterval!);
            }
          } catch (err) {
            console.error(err);
            clearInterval(pollingInterval!);
          }
        }, 30000);
      }
    }
    setLoading(false);
  };

  const handleLoadMoreMessages = async (scrollHeight: number) => {
    lastScrollHeight.current = scrollHeight;
    if (loadMoreRef.current.page < loadMoreRef.current.totalPage) {
      loadMoreRef.current.page++;
      loadMoreRef.current.shouldWait = true;
      const refTimeout = setTimeout(() => {
        loadMoreRef.current.shouldWait = false;
        clearTimeout(refTimeout);
      }, 200);
      await handleGetAndUpdateMessage();
    }
  };

  const handleFirstLoadMessage = async () => {
    handleGetAndUpdateMessage();
  };

  const loadMoreMessageComponents = useMemo(() => {
    return (
      <>
        {loading && (
          <Stack
            justifyContent="center"
            alignItems="center"
            height="100vh"
          >
            <CircularProgress />
          </Stack>
        )}
        {deferredLoadMoreMessages?.map((d) => (
          <MessageItem
            diagrams={d.diagrams}
            problem={d.problem}
            senderType={d.senderType}
            createdAt={d.createdAt}
            responseDiagram={d.diagrams}
            key={Math.random() * 100 * Number(d.createdAt)}
          />
        ))}
        {loadingMessage && (
          <MessageItem
            problem={null}
            senderType={Sender.ASSISTANT}
            createdAt={null}
            diagrams="AIが入力中です..."
            loadingMessageAi={false}
            key={Math.random() * 0.2}
          />
        )}
      </>
    );
  }, [deferredLoadMoreMessages]);

  useEffect(() => {
    const scrollElement = document.querySelector(".p_chat__tab1");
    if (deferredLoadMoreMessages.length) {
      scrollElement?.scrollTo(0, scrollElement.scrollHeight - lastScrollHeight.current);
    }
  }, [deferredLoadMoreMessages, open]);

  useEffect(() => {
    id && handleFirstLoadMessage();
    event.on(EventChatType.LOAD_MORE_MESSAGES, handleLoadMoreMessages);
    return () => {
      clearInterval(pollingInterval!);
      event.removeListener(EventChatType.LOAD_MORE_MESSAGES, handleLoadMoreMessages);
    };
  }, []);

  return loadMoreMessageComponents;
};
export default LoadMoreMessages;
