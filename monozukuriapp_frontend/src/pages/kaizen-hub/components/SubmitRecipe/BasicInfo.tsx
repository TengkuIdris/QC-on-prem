import React, { memo, useMemo } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import style from "../../kaizen-hub.module.css";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { addBasicInfo } from "@/store/slices/submitRecipeSlice";
import { useDraftSave } from "@/hooks/useDradtSave";
import { cleanValues } from "@/utils/cleanValues";
import { ConnectedFocusError } from "focus-formik-error";

interface BasicInfoProps {
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

const validationSchema = Yup.object({
  companyName: Yup.string().max(100, "会社名は100文字以内で入力してください"),
  department: Yup.string().max(50, "部署名は50文字以内で入力してください"),
  email: Yup.string().email("有効なメールアドレスを入力してください").required("メールアドレスは必須です"),
  fullName: Yup.string().max(50, "氏名は50文字以内で入力してください").required("氏名は必須です").trim(),
});

const BasicInfo = memo(({ setStep }: BasicInfoProps) => {
  const dispatch = useAppDispatch();
  const submitRecipe = useAppSelector((state) => state.submitRecipe);
  const { handleSaveDraft, isDraftSaving } = useDraftSave();

  const initialValues = useMemo(
    () => ({
      companyName: submitRecipe.companyName || "",
      department: submitRecipe.department || "",
      email: submitRecipe.email || "",
      fullName: submitRecipe.fullName || "",
    }),
    [submitRecipe],
  );

  const handleSubmit = (values: typeof initialValues) => {
    dispatch(addBasicInfo(values));
    setStep(2);
  };

  return (
    <div className={`${style.container} ${style.containerMedium}`}>
      <div className={style.formSection}>
        <h2 className={style.sectionTitle}>投稿者情報</h2>
        <p className={style.sectionDescription}>改善事例を投稿するあなたの情報を入力してください。</p>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, isValid }) => (
            <Form>
              <ConnectedFocusError />
              <div className={style.formGroup}>
                <label className={style.formLabel}>
                  会社名
                  <span className={style.optional}>任意</span>
                </label>
                <Field
                  name="companyName"
                  type="text"
                  className={`${style.formInput} ${
                    errors.companyName && touched.companyName ? style.formInputError : ""
                  }`}
                  placeholder="例：株式会社〇〇製造"
                />
                <ErrorMessage
                  name="companyName"
                  component="div"
                  className={style.formError}
                />
              </div>

              <div className={style.formGroup}>
                <label className={style.formLabel}>
                  部署
                  <span className={style.optional}>任意</span>
                </label>
                <Field
                  name="department"
                  type="text"
                  className={`${style.formInput} ${errors.department && touched.department ? style.formInputError : ""}`}
                  placeholder="例：生産技術部"
                />
                <ErrorMessage
                  name="department"
                  component="div"
                  className={style.formError}
                />
              </div>

              <div className={style.formGroup}>
                <label className={style.formLabel}>
                  メールアドレス
                  <span className={style.required}>*必須</span>
                </label>
                <Field
                  name="email"
                  type="email"
                  className={`${style.formInput} ${errors.email && touched.email ? style.formInputError : ""}`}
                  placeholder="例：your.email@example.com"
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className={style.formError}
                />
                <div className={style.formHint}>投稿内容に関する確認や、他のユーザーからの連絡に使用されます。</div>
              </div>

              <div className={style.formGroup}>
                <label className={style.formLabel}>
                  氏名
                  <span className={style.required}>*必須</span>
                </label>
                <Field
                  name="fullName"
                  type="text"
                  className={`${style.formInput} ${errors.fullName && touched.fullName ? style.formInputError : ""}`}
                  placeholder="例：山田 太郎"
                />
                <ErrorMessage
                  name="fullName"
                  component="div"
                  className={style.formError}
                />
                <div className={style.charCount}>{values.fullName.length} / 50文字</div>
              </div>

              <div className={style.formActions}>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    className={`${style.btn} ${isDraftSaving ? style.btnDisabled : style.btnSecondary}`}
                    onClick={() => {
                      const data = cleanValues({
                        afterMetrics: submitRecipe.afterMetrics,
                        beforeMetrics: submitRecipe.beforeMetrics,
                        category: +submitRecipe.category,
                        caution: submitRecipe.caution,
                        companyName: values.companyName,
                        department: values.department,
                        email: values.email,
                        fullName: values.fullName,
                        title: submitRecipe.title,
                        execDays: submitRecipe.execDays,
                        prepDays: submitRecipe.prepDays,
                        relatedDocumentIds: submitRecipe.relatedDocuments.map((doc) => doc.id),
                        stepIds: submitRecipe.implementationSteps.map((step) => step.id),
                        summary: submitRecipe.summary,
                        tags: submitRecipe.tags,
                        tip: submitRecipe.tip,
                      });
                      isDraftSaving || handleSaveDraft(data);
                    }}
                    disabled={isDraftSaving}
                  >
                    {isDraftSaving ? "保存中..." : "下書き保存"}
                  </button>
                  <button
                    type="submit"
                    className={`${style.btn} ${style.btnPrimary}`}
                    disabled={!isValid}
                  >
                    次のステップへ →
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
});

export default BasicInfo;
