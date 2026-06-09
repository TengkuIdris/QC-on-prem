import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Typography,
  Box,
  Divider,
} from "@mui/material"
import whyWhyApiClient from "@/services/apis/whyWhyService"
import { toast } from "react-toastify"

interface RootCauseVisibilityDialogProps {
  open: boolean
  threadId: string
  currentPublicScope?: string
  currentHideAuthorName?: boolean
  onClose: () => void
  onSave: (publicScope: "private" | "group" | "company", hideAuthorName: boolean) => void
}

const RootCauseVisibilityDialog: React.FC<RootCauseVisibilityDialogProps> = ({
  open,
  threadId,
  currentPublicScope,
  currentHideAuthorName,
  onClose,
  onSave,
}) => {
  const [publicScope, setPublicScope] = useState<"private" | "group" | "company">("private")
  const [hideAuthorName, setHideAuthorName] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPublicScope((currentPublicScope as "private" | "group" | "company") || "private")
      setHideAuthorName(currentHideAuthorName ?? false)
    }
  }, [open]) // Only depend on 'open' to reset when dialog opens

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await whyWhyApiClient.updateVisibilitySettings(threadId, publicScope, hideAuthorName)
      onSave(publicScope, hideAuthorName)
      toast.success("設定を保存しました")
      onClose()
    } catch (error: any) {
      console.error("Error saving visibility settings:", error)
      toast.error("設定の保存に失敗しました")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      key={`dialog-${open}-${threadId}`}
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
              本分析結果の公開範囲を指定してください
            </FormLabel>
            <RadioGroup
              value={publicScope}
              onChange={(e) => setPublicScope(e.target.value as "private" | "group" | "company")}
            >
              <FormControlLabel
                value="private"
                control={<Radio />}
                label="公開しない"
              />
              <FormControlLabel
                value="group"
                control={<Radio />}
                label="同一グループ内"
              />
              <FormControlLabel
                value="company"
                control={<Radio />}
                label="社内"
              />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
              作成者の公開
            </FormLabel>
            <RadioGroup
              value={hideAuthorName ? "anonymous" : "public"}
              onChange={(e) => setHideAuthorName(e.target.value === "anonymous")}
            >
              <FormControlLabel
                value="public"
                control={<Radio />}
                label="公開"
              />
              <FormControlLabel
                value="anonymous"
                control={<Radio />}
                label="匿名"
              />
            </RadioGroup>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "flex-end" }}>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          sx={{
            bgcolor: "#4B73FF",
            "&:hover": { bgcolor: "#3d5fcc" },
            minWidth: 100,
          }}
        >
          {isSaving ? "保存中..." : "完了"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RootCauseVisibilityDialog

