import React, { useMemo, useState } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import styles from "../../kaizen-hub.module.css";
import { addProcedure, setImplementationSteps } from "@/store/slices/submitRecipeSlice";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { useDraftSave } from "@/hooks/useDradtSave";
import { toast } from "react-toastify";
import { handleApi } from "@/utils/handleApi";
import { implementationStepsService } from "@/services/apis/implementationStepsService";
import FileUploadField from "../../modules/Procedure/FileUploadField";
import { ImprovementRequest } from "@/services/apis";
import { cleanValues } from "@/utils/cleanValues";
import { ConnectedFocusError } from "focus-formik-error";

interface ProcedureProps {
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

export interface Step {
  id?: number;
  stepNumber: number;
  title: string;
  description: string;
  imageFile?: { name: string; size: number };
  url?: string;
  file?: File;
}

export interface ProcedureFormValues {
  prepDays: number;
  execDays: number;
  steps: Step[];
  tip: string;
  caution: string;
}

const positiveIntOptional = Yup.mixed()
  .test("is-number", "有効な数値を入力してください", (value) => value !== undefined && !isNaN(Number(value)))
  .test("is-positive", "0以上の数値を入力してください", (value) => value !== undefined && Number(value) >= 0)
  .test("is-integer", "整数を入力してください", (value) => value !== undefined && Number.isInteger(Number(value)));

const stepSchema = Yup.object({
  title: Yup.string().trim().required("ステップのタイトルは必須です"),
  description: Yup.string().trim().required("ステップの説明は必須です"),
  id: Yup.number().optional().nullable(),
});

const uniqueStepTitles = Yup.array()
  .of(stepSchema)
  .test("unique-step-titles", "ステップのタイトルが重複しています", function (list) {
    if (!Array.isArray(list)) return true;

    const normalize = (s: unknown) =>
      String(s ?? "")
        .normalize("NFKC")
        .trim()
        .toLowerCase();

    const seen = new Map<string, number>();
    for (let i = 0; i < list.length; i++) {
      const key = normalize(list[i]?.title);
      if (!key) continue;
      if (seen.has(key)) {
        return this.createError({
          path: `${this.path}.${i}.title`,
          message: "このタイトルは他のステップと重複しています",
        });
      }
      seen.set(key, i);
    }
    return true;
  });

const validationSchema = Yup.object({
  prepDays: positiveIntOptional.label("準備期間"),
  execDays: positiveIntOptional.label("実施期間"),
  steps: uniqueStepTitles,
  tip: Yup.string().trim().required("実施のコツは必須です"),
  caution: Yup.string().trim().required("注意事項は必須です"),
});

const Procedure: React.FC<ProcedureProps> = ({ setStep }) => {
  const [isDraftSavingPost, setIsDraftSavingPost] = useState(false);
  const dispatch = useAppDispatch();
  const submitRecipe = useAppSelector((state) => state.submitRecipe);
  const { handleSaveDraft, isDraftSaving } = useDraftSave();

  const initialValues: ProcedureFormValues = useMemo(
    () => ({
      prepDays: submitRecipe.prepDays || 0,
      execDays: submitRecipe.execDays || 0,
      steps: [...submitRecipe.steps, ...submitRecipe.implementationSteps],
      tip: submitRecipe.tip || "",
      caution: submitRecipe.caution || "",
    }),
    [submitRecipe],
  );

  const addStep = (values: ProcedureFormValues, setFieldValue: (field: string, value: any) => void) => {
    const newStep: Step = {
      stepNumber: values.steps.length + 1,
      title: "",
      description: "",
    };

    setFieldValue("steps", [...values.steps, newStep]);
  };

  const deleteStep = (
    stepId: number,
    values: ProcedureFormValues,
    setFieldValue: (field: string, value: any) => void,
  ) => {
    const step = values.steps.find((s) => s.stepNumber === stepId);

    if (step && step?.id) {
      dispatch(setImplementationSteps(submitRecipe.implementationSteps.filter((s) => s.id !== step.id)));
    }

    const updatedSteps = values.steps
      .filter((step) => step.stepNumber !== stepId)
      .map((step, index) => ({ ...step, id: index + 1 }));
    setFieldValue("steps", updatedSteps);
  };

  const swapSteps = (
    fromIdx: number,
    toIdx: number,
    values: ProcedureFormValues,
    setFieldValue: (field: string, value: any) => void,
  ) => {
    if (toIdx < 0 || toIdx >= values.steps.length) return;
    const steps = [...values.steps];
    [steps[fromIdx], steps[toIdx]] = [steps[toIdx], steps[fromIdx]];
    const updatedSteps = steps.map((step, index) => ({ ...step, id: index + 1 }));
    setFieldValue("steps", updatedSteps);
  };

  const handleUpdateSteps = async (oldSteps: Step[]) => {
    return await handleApi(
      implementationStepsService.updateSteps(
        oldSteps.map((step) => ({
          id: step.id || 0,
          description: step.description,
          title: step.title,
          stepNumber: step.stepNumber,
        })),
      ),
    );
  };

  const handleSaveDraftPost = async (values: ProcedureFormValues) => {
    const data: ImprovementRequest = cleanValues({
      afterMetrics: submitRecipe.afterMetrics,
      beforeMetrics: submitRecipe.beforeMetrics,
      category: +submitRecipe.category,
      caution: values.caution,
      companyName: submitRecipe.companyName,
      department: submitRecipe.department,
      email: submitRecipe.email,
      fullName: submitRecipe.fullName,
      title: submitRecipe.title,
      execDays: values.execDays,
      prepDays: values.prepDays,
      relatedDocumentIds: submitRecipe.relatedDocuments
        .map((doc) => doc.id)
        .filter((id): id is number => id !== undefined),
      summary: submitRecipe.summary,
      tags: submitRecipe.tags,
      tip: values.tip,
    });
    const oldSteps = values.steps.filter((step) => step.id);

    const newStepsToSubmit = values.steps.filter((step) => !step?.id);
    if (newStepsToSubmit.length > 0) {
      setIsDraftSavingPost(true);
      const formData = new FormData();

      newStepsToSubmit.forEach((step, index) => {
        formData.append(`steps[${index}].stepNumber`, step.stepNumber.toString());
        formData.append(`steps[${index}].title`, step.title);
        formData.append(`steps[${index}].description`, step.description);
        if (step.file && step.file instanceof File) {
          formData.append(`steps[${index}].file`, step.file);
        }
      });

      const [resCreateStep, error] = await handleApi(implementationStepsService.createStep(formData));
      if (resCreateStep) {
        if (oldSteps.length > 0) {
          const [resUpdateSteps, error] = await handleUpdateSteps(oldSteps);
          if (resUpdateSteps) {
            await handleSaveDraft({
              ...data,
              stepIds: [
                ...submitRecipe.implementationSteps.map((step) => step.id),
                ...resCreateStep.data.map((step: any) => step.id),
              ],
            });
          } else {
            toast.error("ドラフトの保存に失敗しました");
            console.error("Draft save error:", error);
          }
        } else {
          await handleSaveDraft({
            ...data,
            stepIds: [
              ...submitRecipe.implementationSteps.map((step) => step.id),
              ...resCreateStep.data.map((step: any) => step.id),
            ],
          });
        }
      } else {
        toast.error("ドラフトの保存に失敗しました");
        console.error("Draft save error:", error);
      }

      setIsDraftSavingPost(false);
    } else {
      if (oldSteps.length > 0) {
        const [resUpdateSteps, error] = await handleUpdateSteps(oldSteps);
        if (resUpdateSteps) {
          await handleSaveDraft({
            ...data,
            stepIds: [...submitRecipe.implementationSteps.map((step) => step.id)],
          });
        }

        if (error) {
          toast.error("ドラフトの保存に失敗しました");
          console.error("Draft save error:", error);
        }
      } else {
        await handleSaveDraft({
          ...data,
          stepIds: [...submitRecipe.implementationSteps.map((step) => step.id)],
        });
      }
    }
  };

  const handleSubmit = async (values: ProcedureFormValues) => {
    await handleSaveData(values, () => setStep(4));
  };

  const handleSaveData = async (values: ProcedureFormValues, callBackSetStep: () => void) => {
    const newStepsToSubmit = values.steps.filter((step) => !step?.id);
    if (newStepsToSubmit.length > 0) {
      const formData = new FormData();

      newStepsToSubmit.forEach((step, index) => {
        formData.append(`steps[${index}].stepNumber`, step.stepNumber.toString());
        formData.append(`steps[${index}].title`, step.title);
        formData.append(`steps[${index}].description`, step.description);
        if (step.file && step.file instanceof File) {
          formData.append(`steps[${index}].file`, step.file);
        }
      });

      const [resCreateStep, error] = await handleApi(implementationStepsService.createStep(formData));
      if (resCreateStep) {
        dispatch(
          addProcedure({
            ...values,
            implementationSteps: [...submitRecipe.implementationSteps, ...resCreateStep.data],
          }),
        );
        callBackSetStep();
      } else {
        toast.error("ドラフトの保存に失敗しました");
        console.error("Draft save error:", error);
      }
    } else {
      dispatch(addProcedure(values));
      callBackSetStep();
    }
  };

  return (
    <div className={`${styles.container} ${styles.containerMedium}`}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, setFieldValue, validateForm, isSubmitting, setErrors, setTouched }) => (
          <Form noValidate>
            <ConnectedFocusError />
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>実施手順の作成</h2>
              <p className={styles.sectionDescription}>
                改善を実施する具体的な手順を記載してください。
                他の人が再現できるよう、できるだけ詳しく記載することをおすすめします。
              </p>

              <div className={styles.timeEstimate}>
                <span className={styles.timeEstimateIcon}>⏱️</span>
                <div className={styles.timeEstimateContent}>
                  <div className={styles.timeEstimateTitle}>実施期間の目安</div>
                  <div className={styles.timeInputs}>
                    <div className="flex flex-col">
                      <div className="flex gap-3">
                        <span>準備期間</span>
                        <Field
                          name="prepDays"
                          type="number"
                          step={1}
                          className={`${styles.timeInput} ${errors.prepDays && touched.prepDays ? styles.formInputError : ""}`}
                          min={0}
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                        <span>日間</span>
                      </div>
                      <div>
                        {errors.prepDays && touched.prepDays && (
                          <span className={styles.formError}>{errors.prepDays}</span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{ marginLeft: 16 }}
                      className="flex flex-col"
                    >
                      <div className="flex gap-3">
                        <span>実施期間</span>
                        <Field
                          name="execDays"
                          type="number"
                          step={1}
                          className={`${styles.timeInput} ${errors.execDays && touched.execDays ? styles.formInputError : ""}`}
                          min={0}
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                        <span>日間</span>
                      </div>
                      <div>
                        {errors.execDays && touched.execDays && (
                          <span className={styles.formError}>{errors.execDays}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.stepBuilder}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>実施ステップ</h3>

                <FieldArray name="steps">
                  {() =>
                    values.steps.map((step, idx) => (
                      <div
                        className={styles.stepBuilderItem}
                        key={step.stepNumber}
                      >
                        <div className={styles.stepBuilderHeader}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span className={`${styles.stepActionBtn} ${styles.dragHandle}`}>⋮⋮</span>
                            <div className={styles.stepNumberLarge}>{step.stepNumber}</div>
                          </div>
                          <div className={styles.stepActions}>
                            <button
                              type="button"
                              className={styles.stepActionBtn}
                              onClick={() => swapSteps(idx, idx - 1, values, setFieldValue)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={styles.stepActionBtn}
                              onClick={() => swapSteps(idx, idx + 1, values, setFieldValue)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className={styles.stepActionBtn}
                              onClick={() => deleteStep(step.stepNumber, values, setFieldValue)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className={styles.formGroup}>
                          <Field
                            name={`steps.${idx}.title`}
                            type="text"
                            className={`${styles.formInput} ${
                              (errors.steps as any)?.[idx]?.title && (touched.steps as any)?.[idx]?.title
                                ? styles.formInputError
                                : ""
                            }`}
                            placeholder="ステップのタイトル"
                          />
                          {(errors.steps as any)?.[idx]?.title && (touched.steps as any)?.[idx]?.title && (
                            <span className={styles.formError}>{(errors.steps as any)[idx].title}</span>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <Field
                            name={`steps.${idx}.description`}
                            as="textarea"
                            className={`${styles.formTextarea} ${
                              (errors.steps as any)?.[idx]?.description && (touched.steps as any)?.[idx]?.description
                                ? styles.formInputError
                                : ""
                            }`}
                            placeholder="このステップの詳細な説明"
                          />
                          {(errors.steps as any)?.[idx]?.description && (touched.steps as any)?.[idx]?.description && (
                            <span className={styles.formError}>{(errors.steps as any)[idx].description}</span>
                          )}
                        </div>

                        <FileUploadField
                          step={step}
                          setFieldValue={setFieldValue}
                          values={values}
                        />
                      </div>
                    ))
                  }
                </FieldArray>

                <button
                  type="button"
                  className={styles.addStepBtn}
                  onClick={() => addStep(values, setFieldValue)}
                >
                  <span>+</span> ステップを追加
                </button>
              </div>

              {/* Tips & Cautions Section */}
              <div className={styles.tipsContainer}>
                <div className={styles.tipCard}>
                  <div className={styles.tipHeader}>
                    <span className={styles.tipIcon}>💡</span>
                    <span>実施のコツ</span>
                  </div>
                  <Field
                    name="tip"
                    as="textarea"
                    className={`${styles.formTextarea} ${errors.tip && touched.tip ? styles.formInputError : ""}`}
                    placeholder="改善を成功させるためのコツやポイント"
                    style={{ minHeight: 80 }}
                  />
                  {errors.tip && touched.tip && <span className={styles.formError}>{errors.tip}</span>}
                </div>
                <div className={styles.tipCard}>
                  <div className={styles.tipHeader}>
                    <span className={styles.tipIcon}>⚠️</span>
                    <span>注意事項</span>
                  </div>
                  <Field
                    name="caution"
                    as="textarea"
                    className={`${styles.formTextarea} ${errors.caution && touched.caution ? styles.formInputError : ""}`}
                    placeholder="実施時の注意点や失敗しやすいポイント"
                    style={{ minHeight: 80 }}
                  />
                  {errors.caution && touched.caution && <span className={styles.formError}>{errors.caution}</span>}
                </div>
              </div>

              {/* Form Actions */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnText}`}
                  onClick={async () => {
                    await handleSaveData(values, () => setStep((prev) => prev - 1));
                  }}
                >
                  ← 前のステップに戻る
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${styles.btn} ${isSubmitting || isDraftSaving || isDraftSavingPost ? styles.btnDisabled : styles.btnSecondary}`}
                    onClick={async () => {
                      const formErrors = await validateForm();

                      if (Object.keys(formErrors).length > 0) {
                        const touchedAll = {
                          prepDays: true,
                          execDays: true,
                          tip: true,
                          caution: true,
                          steps: (values.steps || []).map(() => ({
                            title: true,
                            description: true,
                          })),
                        };
                        setErrors(formErrors);
                        setTouched(touchedAll, true);
                        return;
                      }
                      if (isSubmitting || isDraftSaving || isDraftSavingPost) return;
                      handleSaveDraftPost({ ...values });
                    }}
                    disabled={isSubmitting || isDraftSaving || isDraftSavingPost}
                  >
                    {isSubmitting || isDraftSaving || isDraftSavingPost ? "保存中..." : "下書き保存"}
                  </button>
                  <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                  >
                    確認画面へ進む →
                  </button>
                </div>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Procedure;
