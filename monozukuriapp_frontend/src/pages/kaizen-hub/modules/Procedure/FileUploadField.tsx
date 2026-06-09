import React from "react";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import styles from "../../kaizen-hub.module.css";
import { Step, ProcedureFormValues } from "../../components/SubmitRecipe/Procedure";

const FileUploadField: React.FC<{
  step: Step;
  setFieldValue: (field: string, value: any) => void;
  values: ProcedureFormValues;
}> = ({ step, setFieldValue, values }) => {
  const handleFileChange = (
    stepId: number,
    files: File[],
    setFieldValue: (field: string, value: any) => void,
    values: ProcedureFormValues,
  ) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルのみアップロードできます。");
      return;
    }
    const url = URL.createObjectURL(file);
    const updatedSteps = values.steps.map((step) =>
      step.stepNumber === stepId
        ? { ...step, imageFile: { name: file.name, size: file.size }, url: url, file, id: undefined }
        : step,
    );
    setFieldValue("steps", updatedSteps);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => handleFileChange(step.stepNumber, acceptedFiles, setFieldValue, values),
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === "file-too-large") {
        toast.error("ファイルサイズは5MB以下にしてください。");
      } else if (rejection.errors[0]?.code === "file-invalid-type") {
        toast.error("画像ファイル（JPG, PNG, GIF）のみアップロードできます。");
      } else {
        toast.error("ファイルのアップロードに失敗しました。");
      }
    },
  });

  const removeImage = () => {
    const updatedSteps = values.steps.map((s) =>
      s.stepNumber === step.stepNumber ? { ...s, imageFile: undefined, url: undefined, file: undefined } : s,
    );
    setFieldValue("steps", updatedSteps);
  };

  if (step.url) {
    return (
      <div className={styles.fileUploadAreaStep}>
        <img
          src={step.url}
          alt="アップロード画像"
          style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 6 }}
          className="mx-auto"
        />
        <p className={styles.uploadTextStep}>{step.imageFile?.name}</p>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnText}`}
          style={{ fontSize: 12, padding: "4px 8px", marginTop: 4 }}
          onClick={removeImage}
        >
          削除
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`${styles.fileUploadAreaStep} ${isDragActive ? styles.dragging : ""}`}
    >
      <input {...getInputProps()} />
      <div className={styles.uploadIconStep}>📁</div>
      <p className={styles.uploadTextStep}>
        {isDragActive ? (
          "ここにファイルをドロップしてください"
        ) : (
          <>
            このステップの画像をドラッグ＆ドロップ
            <br />
            または
            <span style={{ color: "var(--primary-color)", textDecoration: "underline" }}>ファイルを選択</span>
          </>
        )}
      </p>
      <p className={styles.uploadHintStep}>JPG, PNG, GIF (最大5MB)</p>
    </div>
  );
};

export default FileUploadField;
