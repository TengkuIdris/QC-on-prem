import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import styles from "./ImprovementRequestForm.module.css";
import { useNavigate } from "react-router-dom";
import feedbackService from "@/services/apis/feedback";

const validationSchema = Yup.object({
  feedback: Yup.string()
    .required("ご要望の入力は必須です")
    .max(1000, "ご要望は1000文字以下で入力してください")
    .trim("前後の空白は削除されます"),
});

const initialValues = {
  feedback: "",
};

const ImprovementRequestPage: React.FC = () => {
  const [showMessage, setShowMessage] = useState<"error" | "success">();
  const navigate = useNavigate();
  const maxLength = 1000;

  const handleSubmit = async (values: typeof initialValues, { setSubmitting, resetForm }: any) => {
    try {
      await feedbackService.addFeedback({ feedback: values.feedback });
      setShowMessage("success");
      resetForm();
    } catch (error) {
      console.error("Error saving feedback:", error);
      setShowMessage("error");
    } finally {
      setSubmitting(false);
      setTimeout(() => setShowMessage(undefined), 5000);
    }
  };

  const handleGoBack = () => {
    navigate("/home");
  };

  const getCharColor = (length: number) => {
    if (length > maxLength * 0.9) return "#ff6b6b";
    if (length > maxLength * 0.7) return "#ffd43b";
    return "#666";
  };

  return (
    <div className="flex justify-center items-center h-full">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <svg
              className={styles.lightbulbIcon}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.85 11.1c-.3.21-.85.36-.85.9V16H10v-2c0-.54-.55-.69-.85-.9C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1zM12 19h-2v1c0 .55.45 1 1 1s1-.45 1-1v-1z" />
              <circle
                cx="12"
                cy="6.5"
                r="0.5"
                fill="white"
                opacity="0.8"
              />
              <circle
                cx="14"
                cy="8"
                r="0.3"
                fill="white"
                opacity="0.6"
              />
            </svg>
          </div>
          <h1 className={styles.title}>品質改善の新時代へ</h1>
          <p className={styles.subtitle}>
            「こんな機能が欲しい」「この操作がわかりづらい」など、
            <br />
            お気づきの点がございましたら、遠慮なくお聞かせください。
          </p>
        </div>

        <div className={styles.formContainer}>
          {showMessage === "success" ? (
            <div className={`${styles.successMessage} ${styles.show}`}>
              ✅ ご要望を受け付けました。ありがとうございます！
            </div>
          ) : (
            showMessage === "error" && (
              <div className={`${styles.errorMessage} ${styles.show}`}>
                ❌ ご要望の送信中にエラーが発生しました。もう一度お試しください。
              </div>
            )
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, isSubmitting, errors, touched }) => (
              <Form>
                <div className={styles.formGroup}>
                  <label
                    className={styles.formLabel}
                    htmlFor="feedback"
                  >
                    ご要望など
                  </label>
                  <Field
                    as="textarea"
                    id="feedback"
                    name="feedback"
                    className={`${styles.formTextarea} ${errors.feedback && touched.feedback ? styles.error : ""}`}
                    placeholder="（例）なぜなぜ分析結果のレポートを出力できるようにしたい"
                    maxLength={maxLength}
                  />
                  <ErrorMessage
                    name="feedback"
                    component="div"
                    className={styles.errorText}
                  />
                  <div
                    className={styles.charCounter}
                    style={{ color: getCharColor(values.feedback.length) }}
                  >
                                        <span
                      key="currentLength"
                      translate="no"
                    >
                      {Number(values.feedback.length)}
                    </span>{" "}
                    /<span key="maxLength">{maxLength}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "送信中..." : "送信する"}
                </button>
              </Form>
            )}
          </Formik>

          <div className={styles.backLink}>
            <a
              href="#"
              onClick={handleGoBack}
            >
              ← ホームに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovementRequestPage;
