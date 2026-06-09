import kaiZenHubService from "@/services/apis/kaizenhubService";
import { updateUserInfo } from "@/store/slices/authSlice";
import { RootState } from "@/store/store";
import { handleApi } from "@/utils/handleApi";
import { Form, Formik } from "formik";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as yup from "yup";
import styles from "../../../pages/kaizen-hub/kaizen-hub.module.css";

const MyPageSchema = yup.object({
  fullName: yup
    .string()
    .max(32, "氏名は32文字以内で入力してください")
    .min(2, "氏名は2文字以上で入力してください")
    .required("氏名は必須です")
    .trim(),
});

const MyPage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();

  const handleSubmitForm = async (values: { fullName: string }, setSubmitting: (isSubmitting: boolean) => void) => {
    setSubmitting(true);
    const id = toast.loading("しばらくお待ちください...");
    try {
      const [res, error] = await handleApi(kaiZenHubService.updateUserInfo({ ...values }));
      if (res?.data) {
        toast.update(id, {
          render: "更新しました",
          type: "success",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });

        dispatch(updateUserInfo(values));
      } else {
        throw new Error(error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "ログインに失敗しました";
      toast.update(id, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h2 className={styles.sectionTitle}>ユーザー情報</h2>
      <Formik
        initialValues={{
          fullName: user.full_name || user?.name || "",
        }}
        validationSchema={MyPageSchema}
        onSubmit={(values, { setSubmitting }) => {
          handleSubmitForm(values, setSubmitting);
        }}
      >
        {({ errors, touched, handleChange, handleBlur, isSubmitting, values }) => (
          <Form>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>会社名</label>
              <div className={`${styles.formSelect} ${styles.formSelectDisabled}`}>
                <select
                  className="w-full"
                  disabled
                  value={user.company_relation?.company_name || ""}
                >
                  <option
                    value=""
                    disabled
                  >
                    会社を選択してください
                  </option>
                  {user.company_relation && (
                    <option value={user.company_relation.company_name}>{user.company_relation.company_name}</option>
                  )}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>所属</label>
              <input
                type="text"
                name="department"
                className={`${styles.formInput} ${styles.formInputDisabled}`}
                placeholder="例：生産技術部"
                value={user.affiliation || ""}
                disabled
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                メールアドレス
                <span className={styles.optional}>任意</span>
              </label>
              <input
                type="email"
                className={`${styles.formInput} ${styles.formInputDisabled}`}
                placeholder="例：your.email@example.com"
                value={user?.email || ""}
                disabled
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                氏名
                <span className={styles.optional}>任意</span>
              </label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="例：山田 太郎"
                name="fullName"
                value={values.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.fullName && touched.fullName && <div className={styles.errorText}>{errors.fullName}</div>}
            </div>

            <div className={styles.saveButton}>
              <button
                type="submit"
                className={styles.btnSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? "保存中..." : "保存する"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default MyPage;
