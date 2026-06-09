import React, { memo } from "react";
import FormSection from "./FormSection";
import styles from "../../../kaizen-hub.module.css";
import PreviewSection from "./PreviewSection";

interface ImproveContentProps {
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

const ImproveContent = memo(({ setStep }: ImproveContentProps) => {
  return (
    <div className={`${styles.container} ${styles.containerLarge} ${styles.containerGridThree}`}>
      <FormSection setStep={setStep} />

      <PreviewSection />
    </div>
  );
});

export default ImproveContent;
