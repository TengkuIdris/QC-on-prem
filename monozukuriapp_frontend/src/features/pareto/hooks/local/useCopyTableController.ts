import { useRef } from "react";
import copy from "copy-to-clipboard";
import { toast } from "react-toastify";

export const useCopyTableController = () => {
  const tableRef = useRef<HTMLTableElement>(null);

  const copyToClipboard = async (text: string) => {
    try {
      copy(text);
      toast.success("コピーしました。");
    } catch (err) {
      toast.error("コピーに失敗しました。");
    }
  };

  return { tableRef, copyToClipboard };
};
