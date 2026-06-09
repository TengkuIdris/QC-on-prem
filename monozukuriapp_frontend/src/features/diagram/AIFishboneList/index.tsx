import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, Card, CardContent, Button, TextField, InputAdornment } from "@mui/material";
import { Search, Visibility, Download } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import chatService from "@/services/apis/chatService";
import { toast } from "react-toastify";

interface AIGeneratedFishbone {
  id: number;
  parameters: any;
  createdAt: string;
  aiAssistant: {
    id: number;
    problem: string;
    createdAt: string;
  };
}

const AIFishboneList: React.FC = () => {
  const navigate = useNavigate();
  const [fishbones, setFishbones] = useState<AIGeneratedFishbone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadFishbones = async () => {
    try {
      setLoading(true);
      const response = await chatService.getAIGeneratedFishbones({
        page,
        size: 10,
        search: searchTerm || undefined,
      });

      if (response?.data?.data) {
        setFishbones(response.data.data);
        setTotalPages(response.data.metadata?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error loading AI-generated fishbones:", error);
      toast.error("AI生成されたフィッシュボーンの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFishbones();
  }, [page, searchTerm]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page when searching
  };

  const handleViewFishbone = (fishboneId: number) => {
    navigate(`/diagram/fishbone/${fishboneId}`);
  };

  const handleDownload = (fishbone: AIGeneratedFishbone) => {
    // TODO: Implement download functionality
    toast.info("ダウンロード機能は準備中です");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
      >
        AI生成されたフィッシュボーン一覧
      </Typography>

      <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          placeholder="フィッシュボーンを検索..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <Button
          variant="outlined"
          onClick={() => navigate("/diagram/ai-fishbone-chart")}
        >
          AI生成に戻る
        </Button>
      </Box>

      {loading ? (
        <Typography>読み込み中...</Typography>
      ) : fishbones.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography
            variant="h6"
            color="text.secondary"
          >
            AI生成されたフィッシュボーンがありません
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          {fishbones.map((fishbone) => (
            <Card
              key={fishbone.id}
              sx={{ p: 2 }}
            >
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography
                      variant="h6"
                      gutterBottom
                    >
                      {fishbone.parameters?.name || fishbone.aiAssistant?.problem || "無題"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      作成日: {new Date(fishbone.createdAt).toLocaleDateString("ja-JP")}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      問題: {fishbone.aiAssistant?.problem}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => handleViewFishbone(fishbone.id)}
                    >
                      表示
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => handleDownload(fishbone)}
                    >
                      ダウンロード
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 1 }}>
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            前へ
          </Button>
          <Typography sx={{ display: "flex", alignItems: "center" }}>
            {page} / {totalPages}
          </Typography>
          <Button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            次へ
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AIFishboneList;
