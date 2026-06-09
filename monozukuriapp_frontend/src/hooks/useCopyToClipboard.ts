import copy from "copy-to-clipboard";
import { toast } from "react-toastify";

export const useCopyToClipboard = () => {
  const copyToClipboard = (text: string) => {
    try {
      copy(text);
      toast.success("対策内容がクリップボードにコピーされました");
    } catch (error) {
      toast.error("コピーに失敗しました");
    }
  };

  return { copyToClipboard };
};
