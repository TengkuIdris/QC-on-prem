import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/whywhy/ui/dialog";
import { Button } from "@/components/whywhy/ui/button";
import { Textarea } from "@/components/whywhy/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/whywhy/ui/avatar";
import { Send, X } from "lucide-react";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { toast } from "react-toastify";
import * as yup from "yup";

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  threadTitle: string;
  userName: string;
}

// Validation schema
const noteSchema = yup.object({
  note: yup.string().max(500, "メモは500文字以内で入力してください。").required("メモを入力してください。"),
});

const NoteModal: React.FC<NoteModalProps> = ({ isOpen, onClose, threadId, threadTitle, userName }) => {
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen && threadId) {
      loadNote();
    }
  }, [isOpen, threadId]);

  const loadNote = async () => {
    try {
      setIsLoading(true);
      const response = await whyWhyApiClient.getThreadNote(threadId);

      // Handle different response formats
      if (response?.data?.data) {
        setNote(response.data.data.note || "");
      } else if (response?.data) {
        setNote(response.data.note || "");
      } else if (response?.note) {
        setNote(response.note || "");
      } else {
        setNote("");
      }
    } catch (error) {
      console.error("Failed to load note:", error);
      toast.error("メモの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError("");

      // Validate note
      await noteSchema.validate({ note });

      setIsSaving(true);
      await whyWhyApiClient.updateThreadNote(threadId, note);
      toast.success("メモを保存しました。");
      onClose();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setError(error.message);
      } else {
        console.error("Failed to save note:", error);
        toast.error("メモの保存に失敗しました。");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Get user initials from name
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="p-5 min-w-[20rem]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 bg-blue-500">
              <AvatarFallback className="text-white text-xs bg-blue-500">{getUserInitials(userName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-sm font-semibold text-gray-900">{userName}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Machine項目に工程情報を追記"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={isLoading}
            maxLength={500}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <p className="text-xs text-gray-500">{note.length}/500文字</p>

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSaving ? "保存中..." : "送信"}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoteModal;
