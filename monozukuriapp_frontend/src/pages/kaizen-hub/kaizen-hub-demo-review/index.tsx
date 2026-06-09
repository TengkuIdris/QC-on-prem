import { CustomButton } from "@/components/ui/Button/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card/Card";
import Label from "@/components/ui/Label/Label";
import TextArea from "@/components/ui/TextArea/TextArea";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Input,
  Paper,
  Radio,
  RadioGroup,
  Rating,
  Typography,
} from "@mui/material";
import { ErrorMessage, Field, Form, Formik, FormikHelpers } from "formik";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

interface ReviewFormValues {
  improvementId: number | string | undefined;
  rate: number;
  comment: string;
  impactPercent: number | null;
  attraction: string[] | any;
  howUse: string | null;
  keyword: string;
}

interface IFeatures {
  key: string;
  label: string;
}

interface IUsage extends IFeatures {}

interface IImpact {
  key: number;
  label: string;
}

export const attraction: IFeatures[] = [
  { key: "実行しやすい", label: "実行しやすい" },
  { key: "効果が高い", label: "効果が高い" },
  { key: "独創的", label: "独創的" },
  { key: "詳細な説明", label: "詳細な説明" },
  { key: "コスト効率が良い", label: "コスト効率が良い" },
  { key: "汎用性がある", label: "汎用性がある" },
];

export const usages: IUsage[] = [
  { key: "REFERENCE", label: "参考にした" },
  { key: "SOME", label: "一部を実践した" },
  { key: "ALL", label: "全て実践した" },
  { key: "NOT_USE", label: "まだ活用していない" },
];

export const impacts: IImpact[] = [
  { key: 0, label: "小さい" },
  { key: 50, label: "50%" },
  { key: 100, label: "大きい" },
];

const CustomErrorMessage = ({ name }: { name: string }) => {
  return (
    <ErrorMessage name={name}>
      {(message) => (
        <Typography
          color="error.main"
          fontSize="0.75rem"
          mt="3px"
        >
          {message}
        </Typography>
      )}
    </ErrorMessage>
  );
};

const ReviewForm: React.FC<{ recipeName?: string }> = ({ recipeName = "5S導入による作業効率向上" }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const handleSubmit = async (values: ReviewFormValues, { setSubmitting }: FormikHelpers<ReviewFormValues>) => {
    try {
      const newAttract = values?.attraction.reduce((item: any, key: any) => {
        if (key) {
          item[key] = true;
        }
        return item;
      }, {});
      values.attraction = JSON.stringify(newAttract);
      await kaiZenHubService.creatReview(values);
      toast.success("レビューの投稿が完了しました。");
      navigate(`/kaizen-hub-search/${id}`);
    } catch (error) {
      toast.error("レビューの投稿が失敗しました。");
    }
    setSubmitting(false);
  };

  const initialValues: ReviewFormValues = {
    improvementId: Number(id),
    rate: 0,
    comment: "",
    impactPercent: null,
    attraction: [],
    howUse: null,
    keyword: "",
  };
  return (
    <Paper
      elevation={4}
      sx={{ borderRadius: "8px", py: 4, height: "100%" }}
      className="w-full"
      data-testid="review-form-paper"
    >
      <Card
        className="w-full max-w-2xl mx-auto"
        data-testid="review-form-card"
      >
        <CardHeader className="mb-6">
          <CardTitle>改善レシピのレビュー</CardTitle>
          <CardDescription>{recipeName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            // validationSchema={ReviewSchema}
          >
            {({ values, isSubmitting, setFieldValue }) => {
              return (
                <Form className="space-y-6">
                  <div>
                    <Label>総合評価</Label>
                    <div className="flex items-center space-x-2">
                      <Rating
                        size="large"
                        value={values.rate}
                        onChange={(_, newValue) => {
                          setFieldValue("rate", newValue);
                        }}
                        name="rate"
                      />
                    </div>
                    <CustomErrorMessage name="rate" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comment">コメント（任意）</Label>
                    <Field
                      as={TextArea}
                      id="comment"
                      name="comment"
                      placeholder="この改善レシピについてのご意見をお聞かせください"
                      rows={3}
                      value={values.comment}
                      className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
                    />
                  </div>

                  <div>
                    <div className="space-y-2">
                      <Label>この改善レシピの影響力</Label>
                      <div className="flex justify-between items-end text-sm text-gray-500">
                        <FormControl fullWidth>
                          <RadioGroup
                            aria-labelledby="controlled-radio-buttons-group"
                            name="impactPercent"
                            onChange={(e) => setFieldValue("impactPercent", parseInt(e.target.value))}
                            sx={{
                              display: "flex",
                              flexDirection: "row",
                              justifyContent: "space-between",
                            }}
                          >
                            {impacts.map((impactPercent) => (
                              <FormControlLabel
                                key={impactPercent.key}
                                value={impactPercent.key}
                                control={<Radio />}
                                checked={values.impactPercent === impactPercent.key}
                                label={impactPercent.label}
                                labelPlacement="bottom"
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </div>
                    </div>
                    <CustomErrorMessage name="impactPercent" />
                  </div>

                  <div className="space-y-2">
                    <FormControl>
                      <Label id="checkbox-buttons-preview">この改善レシピの主な魅力は？（複数選択可）</Label>
                      <FormGroup
                        sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
                        data-testid="attraction-grid"
                      >
                        {attraction.map((feature) => (
                          <FormControlLabel
                            key={feature.key}
                            control={
                              <Field
                                as={Checkbox}
                                type="checkbox"
                                name="attraction"
                                value={feature.key}
                                checked={values?.attraction?.includes(feature.key)}
                              />
                            }
                            label={feature.label}
                          />
                        ))}
                      </FormGroup>
                    </FormControl>
                    <CustomErrorMessage name="attraction" />
                  </div>

                  <div>
                    <FormControl>
                      <Label id="radio-buttons-preview">この改善レシピをどのように活用しましたか？</Label>
                      <Field
                        as={RadioGroup}
                        name="howUse"
                        aria-labelledby="radio-buttons-preview"
                      >
                        {usages.map((howUse) => {
                          return (
                            <FormControlLabel
                              key={howUse.key}
                              control={<Radio />}
                              value={howUse.key}
                              checked={values.howUse === howUse.key}
                              label={howUse.label}
                            />
                          );
                        })}
                      </Field>
                    </FormControl>
                    <CustomErrorMessage name="howUse" />
                  </div>

                  <div className="space-y-2">
                    <Label>この改善レシピに関連するキーワード（任意）</Label>
                    <Field
                      as={Input}
                      value={values.keyword}
                      name="keyword"
                      placeholder="関連するキーワードをカンマ区切りで入力（例：時間短縮,品質向上）"
                      className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
                    />
                  </div>
                  <Box className="flex justify-end gap-2">
                    <CustomButton
                      type="submit"
                      disabled={isSubmitting || JSON.stringify(values) === JSON.stringify(initialValues)}
                    >
                      レビュー投稿
                    </CustomButton>
                  </Box>
                </Form>
              );
            }}
          </Formik>
        </CardContent>
      </Card>
    </Paper>
  );
};

export default ReviewForm;
