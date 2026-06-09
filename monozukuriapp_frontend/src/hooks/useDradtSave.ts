import { App } from "@/enum/pathnames";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { cleanValues } from "@/utils/cleanValues";
import { handleApi } from "@/utils/handleApi";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export function useDraftSave() {
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  const handleSaveDraft = async (values: Record<string, any>) => {
    setIsDraftSaving(true);
    try {
      const data = { ...cleanValues(values), isDraft: true };
      const [res, error] = await handleApi(
        id ? kaiZenHubService.updateImprovement(id, data) : kaiZenHubService.createImprovement(data),
      );
      if (res?.data) {
        toast.success("下書き保存しました");
        navigate(App.KAIZEN_HUB);
      } else {
        toast.error(error?.message || "下書き保存に失敗しました");
      }
    } catch (error) {
      toast.error("下書き保存中にエラーが発生しました");
    } finally {
      setIsDraftSaving(false);
    }
  };

  return { isDraftSaving, handleSaveDraft };
}
