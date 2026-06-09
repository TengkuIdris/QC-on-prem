import React, { useEffect, useMemo, useState } from "react";
import style from "../kaizen-hub.module.css";
import BasicInfo from "../components/SubmitRecipe/BasicInfo";
import ImproveContent from "../components/SubmitRecipe/ImproveContent";
import Procedure from "../components/SubmitRecipe/Procedure";
import ConfirmPost from "../components/SubmitRecipe/ConfirmPost";
import { useAppDispatch } from "@/core/hooks";
import { resetSubmitRecipe } from "@/store/slices/submitRecipeSlice";

const SubmitRecipePage = () => {
  const [step, setStep] = useState(1);
  const dispatch = useAppDispatch();

  const progressSteps = useMemo(() => {
    return [
      { step: 1, label: "基本情報", isActive: step === 1 },
      { step: 2, label: "改善内容", isActive: step === 2 },
      { step: 3, label: "実施手順", isActive: step === 3 },
      { step: 4, label: "確認・投稿", isActive: step === 4 },
    ];
  }, [step]);

  const stepContent = useMemo(() => {
    switch (step) {
      case 1:
        return <BasicInfo setStep={setStep} />;
      case 2:
        return <ImproveContent setStep={setStep} />;
      case 3:
        return <Procedure setStep={setStep} />;
      case 4:
        return <ConfirmPost setStep={setStep} />;
      default:
        return <div>Step {step} content goes here</div>;
    }
  }, [step]);

  useEffect(() => {
    return () => {
      dispatch(resetSubmitRecipe());
    };
  }, []);

  return (
    <>
      <div className={style.progressContainer}>
        <div className={style.progressWrapper}>
          <div className={style.progressSteps}>
            <div className={style.progressLine}>
              <div
                className={style.progressLineActive}
                style={{ width: "25%" }}
              />
            </div>
            {progressSteps.map((_step) => (
              <div
                key={_step.step}
                className={`${style.progressStep} ${_step.isActive ? style.active : ""} ${step > _step.step ? style.completed : ""}`}
              >
                <div className={style.progressCircle}>{step > _step.step ? "✓" : _step.step}</div>
                <span className={style.progressLabel}>{_step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>{stepContent}</div>
    </>
  );
};

export default SubmitRecipePage;
