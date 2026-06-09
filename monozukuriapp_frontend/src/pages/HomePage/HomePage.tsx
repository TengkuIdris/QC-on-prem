import React, { useEffect, useContext, lazy, Suspense, useMemo } from "react";
import { Box, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { HeroSection } from "./HeroSection";
import { FeatureGrid } from "./FeatureGrid";
import { ParetoIcon, FishboneIcon, WhyWhyIcon, LightbulbIcon } from "./FeatureIcons";
import { ChartType } from "@/features/pareto/components/DataFromCloud";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const DataFromCloud = lazy(() =>
  import("@/features/pareto/components/DataFromCloud").then((module) => ({
    default: module.default,
  })),
);

const features = [
  {
    name: "パレート図",
    description: "問題の優先順位付けに役立ちます。重要な課題を効率的に特定し、効果的な改善活動を支援します。",
    cardPath: "/pareto",
    createPath: "/pareto/singlemode",
    icon: ParetoIcon,
    color: "#FF6B6B",
    gradient: "linear-gradient(135deg, #FF8A80 0%, #FF6B6B 100%)",
    status: "よく使われています",
    statusColor: "#E8F5E8",
    statusTextColor: "#2E7D32",
    buttonType: "create" as const,
    buttonText: "新規作成",
  },
  {
    name: "特性要因図",
    description: "問題の原因を体系的に分析します。複雑な課題を整理し、根本原因を特定します。",
    cardPath: "/diagram",
    createPath: "/diagram/general-chart?chart=fishbone",
    icon: FishboneIcon,
    color: "#4ECDC4",
    gradient: "linear-gradient(135deg, #4DD0E1 0%, #4ECDC4 100%)",
    status: "AIアシスト対応",
    statusColor: "#E3F2FD",
    statusTextColor: "#1976D2",
    buttonType: "create" as const,
    buttonText: "新規作成",
  },
  {
    name: "なぜなぜ分析",
    description: "問題の根本原因を特定します。5回の「なぜ」を繰り返し、真の課題解決につなげます。",
    cardPath: "/whywhy",
    createPath: "/whywhy",
    icon: WhyWhyIcon,
    color: "#2196F3",
    gradient: "linear-gradient(135deg, #42A5F5 0%, #2196F3 100%)",
    status: "現在アップデート中",
    statusColor: "#F3E5F5",
    statusTextColor: "#7B1FA2",
    buttonType: "create" as const,
    buttonText: "新規作成",
  },
  {
    name: "ご意見・ご要望",
    description: `「こんな機能が欲しい」 「この操作がわかりづらい」など、
お気づきの点がございましたら、遠慮なくお聞かせください。`,
    cardPath: "/feedback",
    createPath: "/feedback",
    icon: LightbulbIcon,
    color: "#F7B731",
    gradient: "linear-gradient(135deg, #FFCA28 0%, #F7B731 100%)",
    status: "",
    statusColor: "#FFF3E0",
    statusTextColor: "#F57C00",
    buttonType: "feedback" as const,
    buttonText: "ご要望はこちらから",
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);

  useEffect(() => {
    setBreadcrumbItems([{ label: "ホーム" }]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems]);

  const handleCardClick = useMemo(
    () => (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  const memoizedFeatures = useMemo(() => features, []);

  return (
    <Container
      maxWidth={false}
      sx={{
        background: "var(--color-bg-page)",
        paddingTop: 1.5,
        paddingBottom: 3,
        minHeight: "100vh",
      }}
    >
      <Box sx={{ py: 0.5 }}>
        <HeroSection />
        <FeatureGrid
          features={memoizedFeatures}
          onCardClick={handleCardClick}
        />
      </Box>
      <Box sx={{ mt: 4 }}>
        <Suspense fallback={<LoadingSkeleton />}>
          <DataFromCloud
            chartType={ChartType.RECENT_FILES}
            title="最近のファイル"
            show={true}
            showBreadcrumb={false}
            homepage={true}
          />
        </Suspense>
      </Box>
    </Container>
  );
};

export default HomePage;
