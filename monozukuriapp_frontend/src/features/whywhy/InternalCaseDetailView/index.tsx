import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import {
  Container,
  Typography,
  CircularProgress,
  Button,
  Box,
  Paper,
} from "@mui/material";
import { toast } from "react-toastify";
import { ArrowBack, RefreshCw, FileText } from "lucide-react";

const InternalCaseDetailView: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const [isLoading, setIsLoading] = useState(true);
  const [caseData, setCaseData] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "社内の分析事例", href: "#", onClick: () => navigate("/whywhy/internal-cases") },
      { label: "分析事例詳細", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  const handleReturn = useCallback(() => {
    navigate("/whywhy/internal-cases");
  }, [navigate]);

  const handleReport = useCallback(() => {
    if (caseId) {
      navigate(`/report-creation-page/${caseId}`);
    }
  }, [caseId, navigate]);

  const handleRegeneration = useCallback(async () => {
    if (!caseData) return;

    try {
      setIsRegenerating(true);
      // Create a copy of the analysis by creating a new thread with parent_id
      const problemData = {
        title: caseData.state?.problem?.title || caseData.title || "コピー",
        description: caseData.state?.problem?.description || "",
        language: caseData.state?.problem?.language || "ja",
        parent_id: caseId,
      };

      const result = await whyWhyApiClient.createThread(problemData);

      if (result?.data?.data?.thread_id) {
        toast.success("新しい分析セッションを作成しました。");
        navigate(`/whywhy/view/${result.data.data.thread_id}`);
      } else {
        toast.error("分析セッションの作成に失敗しました。");
      }
    } catch (error: any) {
      console.error("Error regenerating case:", error);
      toast.error("分析セッションの作成に失敗しました。");
    } finally {
      setIsRegenerating(false);
    }
  }, [caseData, caseId, navigate]);

  const fetchCaseData = useCallback(async () => {
    if (!caseId) return;
    try {
      setIsLoading(true);
      const response = await whyWhyApiClient.getThread(caseId);
      if (response?.data?.data) {
        setCaseData(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching case data:", error);
      toast.error("事例データの取得に失敗しました。");
      navigate("/whywhy/internal-cases");
    } finally {
      setIsLoading(false);
    }
  }, [caseId, navigate]);

  useEffect(() => {
    if (caseId) {
      fetchCaseData();
    }
  }, [caseId, fetchCaseData]);

  // Navigate to WhyWhyAnalysisView with caseId as sessionId
  useEffect(() => {
    if (caseId && !isLoading && caseData) {
      navigate(`/whywhy/view/${caseId}`, {
        replace: true,
      });
    }
  }, [caseId, isLoading, caseData, navigate]);

  if (isLoading) {
    return (
      <Container maxWidth={false} sx={{ pt: 6, pb: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!caseData) {
    return (
      <Container maxWidth={false} sx={{ pt: 6, pb: 4 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            事例データが見つかりませんでした。
          </Typography>
          <Button onClick={handleReturn} sx={{ mt: 2 }}>
            戻る
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ pt: 2, pb: 4 }}>
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          分析画面に移動中...
        </Typography>
      </Box>
    </Container>
  );
};

export default InternalCaseDetailView;

