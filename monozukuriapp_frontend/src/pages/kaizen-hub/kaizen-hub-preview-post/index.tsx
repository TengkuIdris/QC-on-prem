import { Box, Typography } from "@mui/material";
import React from "react";
import { CardTitle } from "@/components/ui/Card/Card";
import { CustomButton } from "@/components/ui/Button/Button";
import { cx, css } from "@emotion/css";
import ImprovementDetails from "@/pages/kaizen-hub/kaizen-hub-detail-post/components/ImprovementDetails";
import Separator from "@/components/ui/Separator/Separator";
import { useAppSelector } from "@/core/hooks";
import { RootState } from "@/store/store";
type KaizenHubPreviewPostProps = {
  setStep: React.Dispatch<React.SetStateAction<number>>;
  handleToggleModal: () => void;
  dataChanged: any;
  isSubmitted?: boolean;
};
const KaizenHubPreviewPost = ({ setStep, handleToggleModal, dataChanged, isSubmitted }: KaizenHubPreviewPostProps) => {
  const user = useAppSelector((state: RootState) => state.auth.user);

  return (
    <>
      <Box
        p={2}
        className="*:[line-break:anywhere]"
      >
        <Box className="flex justify-between items-start">
          <Box sx={{ width: "100%" }}>
            <CardTitle className="text-xl">改善レシピ：{dataChanged?.title}</CardTitle>
            <Box sx={{ mb: 1 }}>
              <Typography>
                <span className="font-bold">投稿者:</span> {user?.name} | <span className="font-bold">投稿日: </span>
                {new Date(dataChanged?.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </Typography>
              <Typography
                className="!mt-4"
                variant="h6"
              >
                <span className="font-bold">改善前後の比較</span>
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-around",
            alignItems: "center",
            minHeight: { xs: "auto", md: 500 },
            width: "100%",
            gap: { xs: 2, md: 0 },
            mb: { xs: 2, md: 0 },
          }}
          data-testid="image-comparison"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: { xs: "100%", md: "40%" },
              alignSelf: "stretch",
            }}
          >
            {dataChanged?.beforeImage ? (
              <div
                className={cx(
                  "w-full border border-gray-300 rounded-md h-[500px] bg-no-repeat bg-contain bg-center",
                  css`
                    ${dataChanged?.beforeImage &&
                    `background-image: url('${sessionStorage.getItem("beforeImage") || ""}');`}
                  `,
                )}
              />
            ) : (
              <div
                className={cx(
                  "w-full border border-gray-300 rounded-md h-[500px] bg-no-repeat bg-contain bg-center bg-[#E0E0E0] flex flex-col justify-center items-center text-[36px] text-[#ABABAB]",
                )}
              >
                <span>400</span>
                <span>x</span>
                <span>500</span>
              </div>
            )}

            <Typography sx={{ textAlign: "start" }}>
              <ul className="list_none">
                {dataChanged?.situationBeforeImprovement.split("\n").map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: { xs: "100%", md: "40%" },
              alignSelf: "stretch",
            }}
          >
            {dataChanged?.afterImage ? (
              <div
                className={cx(
                  "w-full border border-gray-300 rounded-md h-[500px] bg-no-repeat bg-contain bg-center",
                  css`
                    ${dataChanged?.afterImage &&
                    `background-image: url('${sessionStorage.getItem("afterImage") || ""}');`}
                  `,
                )}
              />
            ) : (
              <div
                className={cx(
                  "w-full border border-gray-300 rounded-md h-[500px] bg-no-repeat bg-contain bg-center bg-[#E0E0E0] flex flex-col justify-center items-center text-[36px] text-[#ABABAB]",
                )}
              >
                <span>400</span>
                <span>x</span>
                <span>500</span>
              </div>
            )}

            <Typography sx={{ textAlign: "start" }}>
              <ul className="list_none">
                {dataChanged?.situationAfterImprovement.split("\n").map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Typography>
          </Box>
        </Box>
        <ImprovementDetails
          labels={dataChanged?.labels.map((item: string) => ({
            label: {
              title: item,
            },
          }))}
          tipsAndTricks={dataChanged?.tipsAndTricks}
        />
        <Separator
          className="my-6"
          data-testid="separator"
        />
        <Typography
          variant="h6"
          className="!font-bold !mb-[8px]"
        >
          詳細な改善手順
        </Typography>
        <ul className="list-none pl-5">
          {dataChanged?.improvementProcedures?.split("\n").map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Box>

      <Box
        display="flex"
        gap={2}
        mt={2}
        justifyContent="flex-end"
      >
        <CustomButton
          onClick={() => setStep(1)}
          disabled={isSubmitted}
        >
          投稿内容の修正
        </CustomButton>
        <CustomButton
          type="submit"
          disabled={isSubmitted}
          onClick={handleToggleModal}
        >
          投稿
        </CustomButton>
      </Box>
    </>
  );
};

export default KaizenHubPreviewPost;
