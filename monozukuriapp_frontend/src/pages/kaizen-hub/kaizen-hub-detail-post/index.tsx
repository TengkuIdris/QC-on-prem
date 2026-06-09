import React, { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useLocation, useParams } from "react-router-dom";
import kaiZenHubService from "../../../services/apis/kaizenhubService";
import DetailPost from "./components/DetailPost";
import { handleApi } from "../../../utils/handleApi";
import style from "../kaizen-hub.module.css";
import { ImprovementDetail } from "@/interfaces/improvement";

const KaizenHubDetailPost = () => {
  const [data, setData] = useState<ImprovementDetail | null>(null);
  const { id } = useParams();
  const location = useLocation();

  const isView = location.state?.isView;

  const handleGetImprovementDetail = async () => {
    const [res] = await handleApi(kaiZenHubService.getImprovementDetail(Number(id), { isViewed: isView }));
    if (res.data) {
      setData(res.data);
    }
  };

  useEffect(() => {
    handleGetImprovementDetail();
  }, []);

  return (
    <div className={`${style.container} ${style.containerLarge} ${style.containerGrid}`}>
      {!data ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 500 }}>
          <CircularProgress size={40} />
        </Box>
      ) : (
        <DetailPost
          isStart
          data={data}
        />
      )}
    </div>
  );
};

export default KaizenHubDetailPost;
