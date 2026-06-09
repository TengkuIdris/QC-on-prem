import React, { useEffect, useMemo, useRef, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import styles from "../../../kaizen-hub.module.css";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { addImproveContent } from "@/store/slices/submitRecipeSlice";
import { handleApi } from "@/utils/handleApi";
import { categoriesService } from "@/services/apis/categoriesService";
import { useDraftSave } from "@/hooks/useDradtSave";
import { relatedDocumentsService } from "@/services/apis/relatedDocumentsService";
import { toast } from "react-toastify";
import FileUploadField from "@/pages/kaizen-hub/modules/ImproveContent/FileUploadField";
import { cleanValues } from "@/utils/cleanValues";
import kaiZenHubService from "@/services/apis/kaizenhubService";
import { useParams } from "react-router-dom";
import { ConnectedFocusError } from "focus-formik-error";

interface FormSectionProps {
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

const metricItemSchema = Yup.object({
  name: Yup.string().trim().required("項目名は必須です").max(50, "項目名は50文字以内で入力してください"),
  value: Yup.string()
    .trim()
    .required("数値は必須です")
    .test("is-number", "有効な数値を入力してください", (value) => value !== undefined && !isNaN(Number(value)))
    .test("is-positive", "0以上の数値を入力してください", (value) => value !== undefined && Number(value) >= 0),
});

const uniqueNamesTest = (label: string) =>
  Yup.array()
    .of(metricItemSchema)
    .test("unique-names", `${label} の項目名が重複しています`, function (list) {
      if (!Array.isArray(list)) return true;
      const seen = new Set<string>();
      for (let i = 0; i < list.length; i++) {
        const raw = list[i]?.name ?? "";
        const key = String(raw).trim().toLowerCase();
        if (!key) continue;
        if (seen.has(key)) {
          return this.createError({
            path: `${this.path}.${i}.name`,
            message: "この項目名は重複しています",
          });
        }
        seen.add(key);
      }
      return true;
    });

const validationSchema = Yup.object({
  title: Yup.string().trim().required("レシピタイトルは必須です").max(100, "タイトルは100文字以内で入力してください"),
  category: Yup.number()
    .required("カテゴリの選択は必須です")
    .test(
      "is-positive",
      "カテゴリは0以上の数値である必要があります",
      (value) => value !== undefined && Number(value) > 0,
    ),
  summary: Yup.string().trim().required("改善の概要は必須です").max(500, "概要は500文字以内で入力してください"),

  beforeMetrics: uniqueNamesTest("改善前"),
  afterMetrics: uniqueNamesTest("改善後"),

  tags: Yup.array().of(Yup.string()),
  files: Yup.array().of(
    Yup.object({
      name: Yup.string().trim().required("ファイル名は必須です"),
      size: Yup.number().required("ファイルサイズは必須です").min(0, "無効なファイルサイズです"),
      id: Yup.number().optional().nullable(),
    }),
  ),
});

export type FormSectionValues = Yup.InferType<typeof validationSchema>;

const FormSection = ({ setStep }: FormSectionProps) => {
  const [categories, setCategories] = useState<{ value: number; label: string }[]>([]);
  const [isDraftSavingPost, setIsDraftSavingPost] = useState(false);
  const filesRef = useRef<File[]>([]);
  const dispatch = useAppDispatch();
  const submitRecipe = useAppSelector((state) => state.submitRecipe);
  const { handleSaveDraft, isDraftSaving } = useDraftSave();
  const { id } = useParams();

  const normalizeMetric = (metric: any) => {
    if (!metric || typeof metric !== "object") {
      return { name: "", value: "" };
    }

    return {
      name: typeof metric.name === "string" ? metric.name : String(metric.name || ""),
      value: typeof metric.value === "string" || typeof metric.value === "number" ? String(metric.value || "") : "",
    };
  };

  const initialValues = useMemo(() => {
    const safeBefore = Array.isArray(submitRecipe.beforeMetrics)
      ? submitRecipe.beforeMetrics.map(normalizeMetric).filter((m) => m.name !== null && m.value !== null)
      : [];

    const safeAfter = Array.isArray(submitRecipe.afterMetrics)
      ? submitRecipe.afterMetrics.map(normalizeMetric).filter((m) => m.name !== null && m.value !== null)
      : [];

    return {
      title: submitRecipe.title || "",
      category: submitRecipe.category || 0,
      summary: submitRecipe.summary || "",
      beforeMetrics: safeBefore.length > 0 ? safeBefore : [],
      afterMetrics: safeAfter.length > 0 ? safeAfter : [],
      tags: Array.isArray(submitRecipe.tags) ? submitRecipe.tags : [],
      files: [...submitRecipe.relatedDocuments.map((doc) => ({ name: doc.name, size: doc.size, id: doc.id }))],
    };
  }, [submitRecipe]);

  const handleSaveDraftPost = async (values: Record<string, any>) => {
    if (values?.title) {
      const isValidTitle = await handleValidateTitle(values.title);
      if (!isValidTitle) {
        toast.error("レシピタイトル使用されている。別のタイトルを試してください。");
        return;
      }
    }

    if (filesRef.current?.length > 0) {
      setIsDraftSavingPost(true);
      const formDataCreateDocument = new FormData();
      filesRef.current.forEach((file) => {
        formDataCreateDocument.append("files", file);
      });
      const [resCreateDocument, error] = await handleApi(
        relatedDocumentsService.createDocument(formDataCreateDocument),
      );

      if (resCreateDocument) {
        const relatedDocumentIds = [
          ...resCreateDocument.data.map((doc: any) => doc.id),
          ...submitRecipe.relatedDocuments.map((doc) => doc.id),
        ];

        await handleSaveDraft({ ...values, relatedDocumentIds });
      } else {
        toast.error("ドキュメントの作成中にエラーが発生しました");
        console.error("Error creating document:", error);
      }
      setIsDraftSavingPost(false);
    } else {
      await handleSaveDraft({ ...values, relatedDocumentIds: submitRecipe.relatedDocuments.map((doc) => doc.id) });
    }
  };

  const handleSubmit = async (values: typeof initialValues) => {
    const isValidTitle = await handleValidateTitle(values.title);

    if (!isValidTitle) {
      toast.error("レシピタイトル使用されている。別のタイトルを試してください。");
      return;
    }

    await handleSaveData(values, () => setStep(3));
  };

  const handleSaveData = async (values: typeof initialValues, callBackSetStep: () => void) => {
    if (filesRef.current?.length > 0) {
      try {
        setIsDraftSavingPost(true);
        const formData = new FormData();
        filesRef.current.forEach((file) => {
          formData.append("files", file);
        });
        const [res, error] = await handleApi(relatedDocumentsService.createDocument(formData));

        if (res) {
          dispatch(addImproveContent({ ...values, relatedDocuments: [...submitRecipe.relatedDocuments, ...res.data] }));
          callBackSetStep();
        }
        if (error) {
          toast.error("ドキュメントの作成中にエラーが発生しました");
          console.error("Error creating document:", error);
        }
      } catch (error) {
        toast.error("ドキュメントの作成中にエラーが発生しました");
        console.error("Error creating document:", error);
      } finally {
        setIsDraftSavingPost(false);
      }
    } else {
      dispatch(addImproveContent({ ...values }));
      callBackSetStep();
    }
  };

  const handleValidateTitle = async (title: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, error] = await handleApi(kaiZenHubService.validateTitle({ title, id: id ? +id : undefined }));

    if (error) {
      console.error("Error validating title:", error);
      return false;
    }

    return true;
  };

  const handleFetchCategories = async () => {
    try {
      const [res, error] = await handleApi(categoriesService.getAll());
      if (res) {
        setCategories(res.data.map((category: any) => ({ value: category.id, label: category.name })));
      }
      if (error) {
        console.error("Error fetching categories:", error);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    handleFetchCategories();
  }, []);

  return (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>改善内容の詳細</h2>
      <p className={styles.sectionDescription}>
        改善前後の数値データと具体的な改善ポイントを入力してください。 数値データは自動的にグラフ化されます。
      </p>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize={true}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, errors, touched, isSubmitting }) => (
          <Form noValidate>
            <ConnectedFocusError />
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                レシピタイトル
                <span className={styles.required}>*必須</span>
              </label>
              <Field
                name="title"
                type="text"
                className={`${styles.formInput} ${errors.title && touched.title ? styles.formInputError : ""}`}
                placeholder="例：組立工程の作業時間を70%削減する方法"
              />
              <ErrorMessage
                name="title"
                component="div"
                className={styles.formError}
              />
              <div className={styles.charCount}>{values.title.length} / 100文字</div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                カテゴリ
                <span className={styles.required}>*必須</span>
                <span className={styles.helpTip}>?</span>
              </label>
              <Field
                as="select"
                name="category"
                className={`${styles.formSelect} ${errors.category && touched.category ? styles.formSelectError : ""}`}
              >
                <option value={0}>カテゴリを選択してください</option>
                {categories.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </Field>
              <ErrorMessage
                name="category"
                component="div"
                className={styles.formError}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                改善前後の数値データ
                <span className={styles.optional}>任意</span>
              </label>
              <div className={styles.beforeAfterContainer}>
                <div className={styles.metricInputGroup}>
                  <div className={styles.metricHeader}>
                    <span>📊</span>
                    改善前
                  </div>
                  <FieldArray name="beforeMetrics">
                    {({ push, remove }) => (
                      <>
                        {values.beforeMetrics.map((metric, index) => (
                          <div
                            key={index}
                            className={styles.metricRow}
                          >
                            <Field
                              name={`beforeMetrics.${index}.name`}
                              type="text"
                              className={`${styles.metricInput} ${
                                (errors.beforeMetrics as any)?.[index]?.name &&
                                (touched.beforeMetrics as any)?.[index]?.name
                                  ? styles.formInputError
                                  : ""
                              }`}
                              placeholder="項目名"
                            />
                            <Field
                              name={`beforeMetrics.${index}.value`}
                              type="number"
                              title="数値"
                              className={`${styles.metricInput} ${
                                (errors.beforeMetrics as any)?.[index]?.value &&
                                (touched.beforeMetrics as any)?.[index]?.value
                                  ? styles.formInputError
                                  : ""
                              }`}
                              placeholder="数値"
                            />
                            <span className={styles.metricUnit}>%</span>
                            {values.beforeMetrics.length > 0 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className={styles.removeMetricBtn}
                                title="削除"
                              >
                                ×
                              </button>
                            )}
                            <ErrorMessage
                              name={`beforeMetrics.${index}.name`}
                              component="div"
                              className={styles.formError}
                            />
                            <ErrorMessage
                              name={`beforeMetrics.${index}.value`}
                              component="div"
                              className={styles.formError}
                            />
                          </div>
                        ))}
                        <ErrorMessage
                          name="beforeMetrics"
                          component="div"
                          className={styles.formError}
                          render={(msg) => {
                            if (typeof msg === "string") {
                              return <div className={styles.formError}>{msg}</div>;
                            }
                            return null;
                          }}
                        />
                        <button
                          type="button"
                          className={styles.addMetricBtn}
                          onClick={() => push({ name: "", value: "" })}
                        >
                          <span>+</span>
                          項目を追加
                        </button>
                      </>
                    )}
                  </FieldArray>
                </div>

                <div className={styles.metricInputGroup}>
                  <div className={styles.metricHeader}>
                    <span>✨</span>
                    改善後
                  </div>
                  <FieldArray name="afterMetrics">
                    {({ push, remove }) => (
                      <>
                        {values.afterMetrics.map((metric, index) => (
                          <div
                            key={index}
                            className={styles.metricRow}
                          >
                            <Field
                              name={`afterMetrics.${index}.name`}
                              type="text"
                              className={`${styles.metricInput} ${
                                (errors.afterMetrics as any)?.[index]?.name &&
                                (touched.afterMetrics as any)?.[index]?.name
                                  ? styles.formInputError
                                  : ""
                              }`}
                              placeholder="項目名"
                            />

                            <Field
                              name={`afterMetrics.${index}.value`}
                              type="number"
                              title="数値"
                              className={`${styles.metricInput} ${
                                (errors.afterMetrics as any)?.[index]?.value &&
                                (touched.afterMetrics as any)?.[index]?.value
                                  ? styles.formInputError
                                  : ""
                              }`}
                              placeholder="数値"
                            />

                            <span className={`${styles.metricUnit}`}>%</span>
                            {values.afterMetrics.length > 0 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className={styles.removeMetricBtn}
                                title="削除"
                              >
                                ×
                              </button>
                            )}
                            <ErrorMessage
                              name={`afterMetrics.${index}.name`}
                              component="div"
                              className={styles.formError}
                            />
                            <ErrorMessage
                              name={`afterMetrics.${index}.value`}
                              component="div"
                              className={styles.formError}
                            />
                          </div>
                        ))}
                        <ErrorMessage
                          name="afterMetrics"
                          component="div"
                          className={styles.formError}
                          render={(msg) => {
                            if (typeof msg === "string") {
                              return <div className={styles.formError}>{msg}</div>;
                            }
                            return null;
                          }}
                        />
                        <button
                          type="button"
                          className={styles.addMetricBtn}
                          onClick={() => push({ name: "", value: "" })}
                        >
                          <span>+</span>
                          項目を追加
                        </button>
                      </>
                    )}
                  </FieldArray>
                </div>
              </div>
              <p className={styles.formHint}>
                💡改善効果が明確に分かるよう、同じ単位で比較可能なデータを入力してください
              </p>
            </div>

            <div className={styles.formGroup}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ width: "100%" }}
              >
                <span>📊</span>
                改善効果をパレート図で出力
              </button>
              <p className={styles.formHint}>
                数値データが入力されている場合、ボタンを押すとパレート図が生成されます（機能は未実装）。
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                改善の概要
                <span className={styles.required}>*必須</span>
              </label>
              <Field
                as="textarea"
                name="summary"
                className={`${styles.formTextarea} ${errors.summary && touched.summary ? styles.formInputError : ""}`}
                placeholder="どのような改善を行ったか、簡潔に説明してください。例：3つの個別工程を1つに統合し、作業の重複を排除しました。"
              />
              <ErrorMessage
                name="summary"
                component="div"
                className={styles.formError}
              />
              <div className={styles.charCount}>{values.summary.length} / 500文字</div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                タグ
                <span className={styles.optional}>任意</span>
              </label>
              <FieldArray name="tags">
                {({ push, remove }) => (
                  <div className={styles.tagInputContainer}>
                    {values.tags.map((tag: string, index: number) => (
                      <span
                        className={styles.tag}
                        key={index}
                      >
                        {tag}
                        <span
                          className={styles.tagRemove}
                          onClick={() => remove(index)}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      type="text"
                      className={styles.tagInput}
                      placeholder="タグを追加（Enterで確定）"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const value = e.currentTarget.value.trim();
                          if (value && !values.tags.includes(value)) {
                            push(value);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </FieldArray>
              <p className={styles.formHint}>関連するキーワードを追加すると、他のユーザーが見つけやすくなります</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                関連資料
                <span className={styles.optional}>任意</span>
              </label>
              <FileUploadField
                setFieldValue={setFieldValue}
                values={values}
                filesRef={filesRef}
              />
              <ErrorMessage
                name="files"
                component="div"
                className={styles.formError}
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnText}`}
                onClick={async () => {
                  await handleSaveData(values, () => setStep((prev) => Math.max(prev - 1, 1)));
                }}
              >
                ← 前のステップに戻る
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${styles.btn} ${isDraftSaving || isDraftSavingPost ? styles.btnDisabled : styles.btnSecondary}`}
                  onClick={() => {
                    if (isDraftSaving || isDraftSavingPost) return;

                    const data = cleanValues({
                      afterMetrics: values.afterMetrics,
                      beforeMetrics: values.beforeMetrics,
                      category: +values.category,
                      caution: submitRecipe.caution,
                      companyName: submitRecipe.companyName,
                      department: submitRecipe.department,
                      email: submitRecipe.email,
                      fullName: submitRecipe.fullName,
                      title: values.title,
                      execDays: submitRecipe.execDays,
                      prepDays: submitRecipe.prepDays,
                      stepIds: submitRecipe.implementationSteps.map((step) => step.id),
                      summary: values.summary,
                      tags: values.tags,
                      tip: submitRecipe.tip,
                    });

                    handleSaveDraftPost({ ...data });
                  }}
                  disabled={isDraftSaving || isDraftSavingPost}
                >
                  {isDraftSaving ? "保存中..." : "下書き保存"}
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "送信中..." : "次のステップへ →"}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default FormSection;
