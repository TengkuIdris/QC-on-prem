import React from "react";
import {
  Avatar,
  Card,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Rating,
} from "@mui/material";
import { attraction, impacts, usages } from "@/pages/kaizen-hub/kaizen-hub-demo-review";

const ReviewView = ({ data }: any) => {
  const _attraction = JSON.parse(data?.attraction);
  const attractionActive = Object.keys(_attraction).filter((item) => _attraction[item] === true);

  return (
    <>
      <Paper
        elevation={4}
        sx={{ borderRadius: "8px", py: 4, height: "100%" }}
        className="w-full"
      >
        <Card className="w-full max-w-2xl mx-auto !shadow-none">
          <div className="text-center my-6">
            <Avatar className="m-auto" />
            <div>{data?.author}</div>
          </div>
          <div className="my-6">
            <div className="text-sm font-bold mb-1">総合評価</div>
            <div className="flex items-center space-x-2">
              <Rating
                size="large"
                value={data?.rate}
                name="rate"
                disabled
              />
            </div>
          </div>
          <div className="my-6">
            <div className="font-bold mb-1">コメント（任意）</div>
            {data?.comment && (
              <div className="[&>*>span]:!text-black [&>*>span]:!opacity-85">{data?.comment || ""}</div>
            )}
          </div>
          <div className="my-6">
            <div className="font-bold mb-1">この改善レシピの影響力</div>
            <div className="flex justify-between items-end text-sm w-full">
              <RadioGroup
                aria-labelledby="controlled-radio-buttons-group"
                name="impactPercent"
                className="flex justify-between items-end text-sm w-full !flex-row [&>*>span]:!text-black [&>*>span]:!opacity-85"
              >
                {impacts.map((impactPercent) => (
                  <FormControlLabel
                    key={impactPercent.key}
                    disabled={true}
                    control={<Radio />}
                    checked={data?.impactPercent === impactPercent.key}
                    label={impactPercent.label}
                    labelPlacement="bottom"
                  />
                ))}
              </RadioGroup>
            </div>
          </div>
          <div className="my-6">
            <FormControl>
              <FormLabel className="!font-bold mb-1 !text-black opacity-85">
                この改善レシピの主な魅力は？（複数選択可）
              </FormLabel>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
                className="[&>*>span]:!text-black [&>*>span]:!opacity-85"
              >
                {attraction.map((feature) => (
                  <FormControlLabel
                    key={feature.key}
                    control={
                      <Checkbox
                        disabled
                        value={feature.key}
                        checked={attractionActive?.includes(feature.key)}
                        name="attraction"
                      />
                    }
                    label={feature.label}
                  />
                ))}
              </div>
            </FormControl>
          </div>
          <div className="my-6">
            <FormControl>
              <FormLabel className="!font-bold mb-1 !text-black opacity-85">
                この改善レシピをどのように活用しましたか？
              </FormLabel>
              <RadioGroup
                aria-labelledby="controlled-radio-buttons-group"
                name="howUse"
                className="flex text-sm w-full [&>*>span]:!text-black [&>*>span]:!opacity-85"
              >
                {usages.map((howUse) => {
                  return (
                    <FormControlLabel
                      key={howUse.key}
                      disabled={true}
                      control={<Radio />}
                      value={howUse.key}
                      checked={data.howUse === howUse.key}
                      label={howUse.label}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>
          </div>
          <div className="space-y-2">
            <div className="font-bold mb-1">この改善レシピに関連するキーワード（任意）</div>
            {data?.keyword && (
              <div className="[&>*>span]:!text-black [&>*>span]:!opacity-85">{data?.keyword || ""}</div>
            )}
          </div>
        </Card>
      </Paper>
    </>
  );
};

export default ReviewView;
