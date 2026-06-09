import React from "react";
import { toast } from "react-toastify";
import { ALLOWED_TYPES, MAX_FILES, MAX_SIZE } from "../../constants/allowes-types.constant";
import { useDropzone } from "react-dropzone";
import styles from "../../kaizen-hub.module.css";
import { FormikErrors } from "formik";
import { FormSectionValues } from "../../components/SubmitRecipe/ImproveContent/FormSection";
import { formatSizeFile } from "@/utils/formatSizeFile";
import { useAppDispatch, useAppSelector } from "@/core/hooks";
import { setRelatedDocuments } from "@/store/slices/submitRecipeSlice";

interface FileUploadFieldProps {
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean,
  ) => Promise<void | FormikErrors<FormSectionValues>>;
  values: FormSectionValues;
  filesRef: React.MutableRefObject<File[]>;
}

const FileUploadField = ({ setFieldValue, values, filesRef }: FileUploadFieldProps) => {
  const relatedDocuments = useAppSelector((state) => state.submitRecipe.relatedDocuments);
  const dispatch = useAppDispatch();
  const files = values.files || [];

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length + files.length > MAX_FILES) {
      toast.error(`ファイルは最大${MAX_FILES}個までアップロードできます`);
      return;
    }

    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} のサイズが10MBを超えています`);
        return false;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} はサポートされていないファイル形式です`);
        return false;
      }

      return true;
    });

    setFieldValue("files", [...files, ...validFiles.map((file) => ({ name: file.name, size: file.size }))]);
    filesRef.current.push(...validFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  const removeFile = (index: number) => {
    const file = files[index];
    if (file.id) {
      const newRelatedDocuments = relatedDocuments.filter((doc) => doc.id !== file.id);
      dispatch(setRelatedDocuments(newRelatedDocuments));
    }
    const newFiles = files.filter((_: any, i: number) => i !== index);
    setFieldValue("files", newFiles);
    filesRef.current = filesRef.current.filter((_, i) => i !== index);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`${styles.fileUploadArea} ${isDragActive ? styles.dragging : ""}`}
        style={{
          cursor: "pointer",
          backgroundColor: isDragActive ? "#f0f9ff" : "transparent",
          borderColor: isDragActive ? "#2563eb" : "#d1d5db",
        }}
      >
        <input {...getInputProps()} />
        <div className={styles.uploadIcon}>📁</div>
        <p className={styles.uploadText}>
          {isDragActive ? (
            "ここにファイルをドロップしてください"
          ) : (
            <>
              ファイルをドラッグ＆ドロップ
              <br />
              または
              <span style={{ color: "var(--primary-color)", textDecoration: "underline" }}>ファイルを選択</span>
            </>
          )}
        </p>
        <p className={styles.uploadHint}>PDF、Excel、画像ファイル（最大10MB）</p>
      </div>

      {files.length > 0 && (
        <div
          className={styles.uploadedFiles}
          style={{ marginTop: "12px" }}
        >
          {files.map((file: { name: string; size: number }, index: number) => (
            <div
              key={index}
              className={styles.uploadedFile}
            >
              <span className={styles.fileName}>📎 {file.name}</span>
              <span className={styles.fileSize}>{formatSizeFile(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className={styles.removeFileBtn}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadField;
