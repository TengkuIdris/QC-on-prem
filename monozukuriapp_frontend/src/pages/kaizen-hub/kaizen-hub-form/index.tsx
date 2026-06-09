import React, { useState } from "react";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/Card/Card";
import { FormikErrors, useFormikContext } from "formik";
import { useEffect } from "react";
import { Field, Form, ErrorMessage } from "formik";
import Select from "../../../components/ui/Select/Select";
import InputFile from "../../../components/ui/Input/InputFile";
import Label from "../../../components/ui/Label/Label";
import { options, validateSchema } from "../kaizen-hub-demo-post";
import { Typography } from "@mui/material";
import MultipleInput from "../../../components/ui/MultipleInput/MultipleInput";
import { CustomButton } from "../../../components/ui/Button/Button";
import { TypeSubmit } from "../../../enum/kaizenhub/typeSubmit";

export interface FormProps {
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => Promise<void | FormikErrors<any>>;
  values: string[];
  setValues: React.Dispatch<React.SetStateAction<string[]>>;
  setErrors: (errors: FormikErrors<any>) => void;
  errors: FormikErrors<any>;
  setBeforeImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  setAfterImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  beforeImagePreview: string | null;
  afterImagePreview: string | null;
  isSubmitted: boolean;
  typeSubmit: React.MutableRefObject<TypeSubmit | undefined>;
  handleScroll: (err: any) => void;
  handleFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    setFieldValue: any,
    fieldName: string,
  ) => void;
  setValidateType: React.Dispatch<any>;
  validateType: any;
  errorLabel: string | undefined;
  setErrorLabel: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFieldError: (field: string, message: string | undefined) => void;
}
const KaizenhubForm = ({
  setFieldValue,
  values,
  setValues,
  errors,
  setBeforeImagePreview,
  setAfterImagePreview,
  beforeImagePreview,
  afterImagePreview,
  isSubmitted,
  typeSubmit,
  handleScroll,
  handleFileChange,
  setValidateType,
  setFieldError,
  errorLabel,
  setErrorLabel,
  validateType,
}: FormProps) => {
  const [render, setRender] = useState({});
  useEffect(() => {
    setFieldValue("labels", values);
  }, [values, setFieldValue]);

  const formik = useFormikContext();

  useEffect(() => {
    if (typeSubmit.current === TypeSubmit.DRAF) {
      formik.handleSubmit();
      setRender({});
    }
    if (typeSubmit.current === TypeSubmit.RECORD) {
      formik.handleSubmit();
      setRender({});
    }
  }, [validateType]);
  useEffect(() => {
    if (typeSubmit.current === TypeSubmit.DRAF) {
      const keyErrors = Object.keys(formik.errors)?.length;
      if (keyErrors || errorLabel) {
        handleScroll(errors);
      }
    }
    if (typeSubmit.current === TypeSubmit.RECORD) {
      const keyErrors = Object.keys(formik.errors)?.length;
      if (keyErrors || errorLabel) {
        handleScroll(errors);
        formik.setFieldTouched("type", true, true);
      }
    }
  }, [render]);
  return (
    <Form
      className="space-y-6"
      id="formKaizenhub"
      role="form"
    >
      <CardHeader className="mb-10">
        <CardTitle>新しい改善レシピを投稿</CardTitle>
        <CardDescription>あなたの改善アイデアをシェアしましょう</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 title mb-5">
          <Label htmlFor="title">タイトル</Label>
          <Field
            name="title"
            placeholder="改善レシピのタイトルを入力してください"
            className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
            onChange={async (e: any) => {
              await formik.setFieldValue("title", e.target.value, true);
              await formik.validateField("title");
              await formik.setFieldTouched("title", true, true);
            }}
            error={
              //@ts-ignore
              formik?.touched?.title &&
              //@ts-ignore
              Boolean(formik?.errors?.title)
            }
            onBlur={() => {}}
          />
          {
            //@ts-ignore
            formik?.touched?.title && (
              <Typography
                variant="caption"
                color="error"
              >
                {
                  //@ts-ignore
                  formik?.errors.title as any
                }
              </Typography>
            )
          }
        </div>

        <div className="space-y-2 description mb-5">
          <Label htmlFor="description">概要</Label>
          <Field
            name="description"
            as="textarea"
            placeholder="改善レシピの概要を入力してください"
            rows={3}
            className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
          />
          <ErrorMessage
            name="description"
            component="div"
            className="text-red-500 text-sm"
          />
        </div>
        <div className="space-y-2 mb-5">
          <Label
            htmlFor="type"
            className="typeForm"
          >
            カテゴリー
          </Label>
          <Field name="type">
            {({ field }: any) => (
              <Select
                value={options.find((option) => option.value === field.value)}
                onChange={async (selectedOption: any) => {
                  await formik.setFieldValue("type", selectedOption?.value, true);
                  await formik.validateField("type");
                  await formik.setFieldTouched("type", true, true);
                }}
                options={options}
                filterOption={(option: any, inputValue: string) => {
                  const label = option.label.toLowerCase();
                  return label.includes(inputValue.toLowerCase());
                }}
                className="w-full border-2 rounded-lg border-gray-300 border-solid outline-gray-400"
              />
            )}
          </Field>
          {
            //@ts-ignore
            formik?.touched?.type && (
              <Typography
                variant="caption"
                color="error"
              >
                {
                  //@ts-ignore
                  formik?.errors?.type as any
                }
              </Typography>
            )
          }
        </div>

        <div className="space-y-2 mb-5">
          <Label
            htmlFor="labels"
            className="labelsForm"
          >
            タグ
          </Label>
          <div className="flex flex-wrap gap-2 mt-2">
            <MultipleInput
              values={values}
              setValues={setValues}
              setFieldError={setFieldError}
              setErrorLabel={setErrorLabel}
            />
            <Field
              name="labels"
              className="hidden"
            />
            <div className="text-red-500 text-sm flex w-full">{errorLabel ? errorLabel : ""}</div>
          </div>
        </div>

        <div className="space-y-2 situationBeforeImprovement mb-5">
          <Label htmlFor="situationBeforeImprovement">改善前の状況</Label>
          <Field
            name="situationBeforeImprovement"
            as="textarea"
            placeholder="改善前の問題点や状況を詳しく説明してください"
            rows={4}
            className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
          />
          <ErrorMessage
            name="situationBeforeImprovement"
            component="div"
            className="text-red-500 text-sm"
          />
        </div>

        <div className="space-y-2 situationAfterImprovement mb-5">
          <Label htmlFor="situationAfterImprovement">改善後の状況</Label>
          <Field
            name="situationAfterImprovement"
            as="textarea"
            placeholder="改善後の結果や効果を詳しく説明してください"
            rows={4}
            className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
          />
          <ErrorMessage
            name="situationAfterImprovement"
            component="div"
            className="text-red-500 text-sm"
          />
        </div>

        <div className="space-y-2 improvementProcedures mb-5">
          <Label htmlFor="improvementProcedures">改善手順</Label>
          <Field
            name="improvementProcedures"
            as="textarea"
            placeholder="改善の具体的な手順や方法を箇条書きで説明してください"
            rows={6}
            className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
          />
          <ErrorMessage
            name="improvementProcedures"
            component="div"
            className="text-red-500 text-sm"
          />
        </div>

        <div className="space-y-2 tipsAndTricks mb-5">
          <Label htmlFor="tipsAndTricks">コツやポイント</Label>
          <Field
            name="tipsAndTricks"
            as="textarea"
            placeholder="改善を成功させるためのコツやポイントがあれば記入してください"
            rows={3}
            className="w-full border-2 rounded-lg p-2 border-gray-300 border-solid outline-gray-400 bg-white"
          />
          <ErrorMessage
            name="tipsAndTricks"
            component="div"
            className="text-red-500 text-sm"
          />
        </div>

        <div className="space-y-2 mb-5">
          <Label>画像アップロード</Label>
          <div
            className="grid grid-cols-2 gap-4 beforeImage"
            data-testid="image-upload-grid"
          >
            <div>
              <InputFile
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex justify-center items-center"
                accept="image/*"
                text="改善前の画像をドラッグ＆ドロップ"
                setPreviewUrl={setBeforeImagePreview}
                previewUrl={beforeImagePreview}
                onChange={(e: any) => {
                  handleFileChange(e, setBeforeImagePreview, setFieldValue, "beforeImage");
                }}
              />
              <ErrorMessage
                name="beforeImage"
                component="div"
                className="text-red-500 text-sm mt-2"
              />
            </div>

            <div>
              <InputFile
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex justify-center items-center afterImage "
                accept="image/*"
                text="改善後の画像をドラッグ＆ドロップ"
                setPreviewUrl={setAfterImagePreview}
                previewUrl={afterImagePreview}
                onChange={(e: any) => handleFileChange(e, setAfterImagePreview, setFieldValue, "afterImage")}
              />
              <ErrorMessage
                name="afterImage"
                component="div"
                className="text-red-500 text-sm mt-2"
              />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end items-center gap-2 mt-8">
        <CustomButton
          type="button"
          disabled={isSubmitted}
          onClick={() => {
            typeSubmit.current = TypeSubmit.DRAF;
            setValidateType({
              type: validateSchema[typeSubmit.current] as any,
            });
          }}
        >
          下書き保存
        </CustomButton>
        <CustomButton
          type="button"
          disabled={isSubmitted}
          onClick={async () => {
            typeSubmit.current = TypeSubmit.RECORD;
            setValidateType({
              type: validateSchema[typeSubmit.current] as any,
            });
          }}
        >
          投稿内容の確認
        </CustomButton>
      </CardFooter>
    </Form>
  );
};
export default KaizenhubForm;
