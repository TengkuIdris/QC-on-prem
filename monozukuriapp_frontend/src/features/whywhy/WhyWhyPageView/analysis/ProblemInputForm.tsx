"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/whywhy/ui/button";
import { Input } from "@/components/whywhy/ui/input";
import { Label } from "@/components/whywhy/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { Textarea } from "@/components/whywhy/ui/textarea";
import { Select as MuiSelect, MenuItem as MuiMenuItem, OutlinedInput, InputAdornment } from "@mui/material";
import { Checkbox } from "@/components/whywhy/ui/checkbox";
import {
  Building2,
  FileText,
  Settings,
  BarChart3,
  TreePine,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Package,
  Calendar,
  MapPin,
  Target,
  FileDown,
  Lightbulb,
  Globe,
} from "lucide-react";
import { ProblemInput, ProblemInputSchema, Severity, DefectType, Frequency } from "@/utils/problem";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/whywhy/ui/dialog";
import { useAutoSaveForm } from "@/hooks/useAutoSaveForm";
import { DatePicker } from "@/components/whywhy/ui/date-picker";

// CSS for datetime-local input
// const dateTimeInputStyles = `
//   input[type="datetime-local"]::-webkit-calendar-picker-indicator {
//     cursor: pointer;
//     opacity: 1;
//     filter: invert(0);
//   }

//   input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
//     opacity: 0.8;
//   }

//   input[type="datetime-local"]::-webkit-calendar-picker-indicator:active {
//     opacity: 0.6;
//   }
// `;

// Language options
const languageOptions = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
  { value: "zh-CN", label: "中文 (简体)" },
  { value: "zh-TW", label: "中文 (繁體)" },
  { value: "ko", label: "한국어" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "th", label: "ไทย" },
  { value: "ms", label: "Bahasa Melayu" },
];

// Example data
const exampleData = {
  basic: {
    title: "製品Aのパネル部分に塗装ムラが発生",
    product_name: "製品A型パネル",
    occurrence_date: "2023-07-15T10:30",
    process: "塗装工程 (B-12ライン)",
    location: "第2工場 塗装エリア",
    severity: Severity.MEDIUM,
    description:
      "製品Aの表面塗装に不均一なムラが発生している。特に曲面部分で塗装の厚みにばらつきがあり、光沢ムラとなって視認できる。\n\n品質検査で10%程度の製品に同様の不具合が見つかっており、過去2週間で発生率が上昇している。\n\n顧客からのクレームはまだないが、出荷前検査での不良率増加が問題となっている。",
    defect_types: [DefectType.APPEARANCE],
    frequency: Frequency.OCCASIONAL,
    frequency_percentage: "10",
  },
  fivem: {
    man_details:
      "塗装担当作業員は3名体制。最近、熟練者1名が休暇により不在で、新人作業員が補充された。新人は2週間の研修を終了しているが、実務経験は1ヶ月未満。",
    machine_details:
      "塗装ブースは昨年導入された新型（TB-200）を使用。スプレーガンのノズルサイズは標準0.8mmを使用。スプレー圧は0.3MPaに設定している。\n\n保守点検記録では、2週間前に定期メンテナンスを実施済み。",
    material_details:
      "塗料：アクリル系2液型塗料（型番：AC-P2000）\nロット番号：P22050623\n\n粘度：製造元推奨値20±2秒（NK-2カップ）に対し、現在使用中のものは23秒と若干高め。\n希釈率：標準15%に対し、現場では12%で使用。",
    method_details:
      "標準作業手順書（SOP-P-001）に従い、前処理→下塗り→乾燥→中塗り→乾燥→上塗りの工程で実施。\n\n塗装間隔は下塗り後30分、中塗り後45分の乾燥時間を確保している。\n\n吹き付け距離は20cmを基準としている。",
    measurement_details:
      "膜厚計（DM-5000）で抜き取り検査を実施。\n合格基準：60±10μm\n\n実測データ（直近10個）：55, 58, 72, 65, 60, 63, 75, 57, 68, 63μm\n\n膜厚計の校正：3ヶ月前に実施済",
    environment_details:
      "塗装ブース環境条件：\n温度：23±2℃（記録では最近25℃まで上昇）\n湿度：設定値50±5%（記録では45～60%でばらつきあり）\n\n集塵機は正常に作動しているが、フィルターの交換時期が近づいている（使用率85%）。",
  },
  investigation: {
    direct_cause:
      "塗料の粘度が高くなったことで均一な塗布が困難になり、塗装ムラが発生したと考えられる。\n\n粘度上昇の原因として、希釈率の不足、温度上昇による塗料の変質、または撹拌不足の可能性がある。",
    timeline_analysis:
      "6/15: 新ロット（P22050623）の塗料を使用開始\n6/20: 品質検査で不良率が5%から8%に上昇\n6/25: 熟練作業者が休暇\n6/28: 新人作業員が配属\n7/01: 不良率が10%に上昇\n7/10: 膜厚のばらつきが顕著に\n7/15: 本問題を正式に品質課題として登録",
  },
};

interface ProblemInputFormProps {
  onSubmit: (data: ProblemInput, parentId?: string) => void;
  isLoading?: boolean;
  initialData?: Partial<ProblemInput>;
  goToStep?: number;
}

export function ProblemInputForm({ onSubmit, isLoading, initialData, goToStep }: ProblemInputFormProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get("parentId");
  const prefillData = location.state?.prefillData;

  // Add CSS to hide default calendar picker and show custom one
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        opacity: 0;
        width: 0;
        height: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [currentStep, setCurrentStep] = useState(goToStep || 1);
  const totalSteps = 3;

  // ダイアログ表示状態
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [currentExampleType, setCurrentExampleType] = useState<"basic" | "fivem" | "investigation">("basic");

  // Auto-save functionality
  const {
    data: autoSaveData,
    setData: setAutoSaveData,
    saveStatus,
    error: saveError,
  } = useAutoSaveForm<Partial<ProblemInput>>(initialData || {}, {
    debounceMs: 2000,
    onSave: async (data) => {
      // ローカルストレージに保存
      localStorage.setItem("problem-input-draft", JSON.stringify(data));
    },
    onError: (error) => {
      console.error("自動保存エラー:", error);
    },
  });

  // Restore initial data
  useEffect(() => {
    const savedDraft = localStorage.getItem("problem-input-draft");
    if (savedDraft && !initialData && !prefillData) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setAutoSaveData(parsedDraft);
      } catch (error) {
        console.error("保存データの復元エラー:", error);
      }
    }
  }, [initialData, setAutoSaveData, prefillData]);

  // Mapping for Japanese display names
  const defectTypeLabels: Record<DefectType, string> = {
    [DefectType.APPEARANCE]: "外観不具合",
    [DefectType.DIMENSION]: "寸法不具合",
    [DefectType.FUNCTION]: "機能不具合",
    [DefectType.MATERIAL]: "材料不具合",
    [DefectType.STRENGTH]: "強度不具合",
    [DefectType.DURABILITY]: "耐久性不具合",
    [DefectType.SAFETY]: "安全性不具合",
    [DefectType.OTHER]: "その他",
  };

  // Reverse mapping from Japanese to enum values
  const defectTypeFromJapanese: Record<string, DefectType> = {
    外観: DefectType.APPEARANCE,
    外観不具合: DefectType.APPEARANCE,
    寸法: DefectType.DIMENSION,
    寸法不具合: DefectType.DIMENSION,
    機能: DefectType.FUNCTION,
    機能不具合: DefectType.FUNCTION,
    材料: DefectType.MATERIAL,
    材料不具合: DefectType.MATERIAL,
    強度: DefectType.STRENGTH,
    強度不具合: DefectType.STRENGTH,
    耐久性: DefectType.DURABILITY,
    耐久性不具合: DefectType.DURABILITY,
    安全性: DefectType.SAFETY,
    安全性不具合: DefectType.SAFETY,
    その他: DefectType.OTHER,
  };

  // Reverse mapping for severity
  const severityFromJapanese: Record<string, Severity> = {
    軽微: Severity.LOW,
    中程度: Severity.MEDIUM,
    重大: Severity.HIGH,
  };

  // Reverse mapping for frequency
  const frequencyFromJapanese: Record<string, Frequency> = {
    頻繁: Frequency.FREQUENT,
    散発: Frequency.OCCASIONAL,
    稀: Frequency.RARE,
    初回: Frequency.FIRST_TIME,
  };

  const severityLabels: Record<Severity, string> = {
    [Severity.LOW]: "軽微",
    [Severity.MEDIUM]: "中程度",
    [Severity.HIGH]: "重大",
  };

  const frequencyLabels: Record<Frequency, string> = {
    [Frequency.FREQUENT]: "頻繁",
    [Frequency.OCCASIONAL]: "時々",
    [Frequency.RARE]: "稀",
    [Frequency.FIRST_TIME]: "初回",
  };

  const { register, handleSubmit, setValue, watch, formState, control } = useForm({
    resolver: zodResolver(ProblemInputSchema),
    defaultValues: {
      language: "ja",
      defect_types: [],
      investigations: [],
      verification: {
        method: "",
        result: "",
        date: "",
        verifier: "",
        investigator: "",
      },
      ...autoSaveData,
      ...initialData,
    },
    mode: "onChange",
  });

  useEffect(() => {
    const htmlElement = document.querySelector("html");

    if (htmlElement) {
      htmlElement.style.overflow = "hidden";
      htmlElement.style.height = "100vh";
    }

    return () => {
      if (htmlElement) {
        htmlElement.style.overflow = "";
        htmlElement.style.height = "";
      }
    };
  }, []);

  // Prefill data from parent thread

  // Stable function to handle prefilling
  const handlePrefill = useCallback(
    (dataToPrefill: any) => {
      if (!dataToPrefill) return;

      // Convert data from Japanese to enum values if needed
      const processedData = { ...dataToPrefill };

      // Convert defect_types
      if (processedData.defect_types && Array.isArray(processedData.defect_types)) {
        processedData.defect_types = processedData.defect_types.map((type: any) => {
          if (typeof type === "string" && defectTypeFromJapanese[type]) {
            return defectTypeFromJapanese[type];
          }
          return type;
        });
      }

      // Convert severity
      if (
        processedData.severity &&
        typeof processedData.severity === "string" &&
        severityFromJapanese[processedData.severity]
      ) {
        processedData.severity = severityFromJapanese[processedData.severity];
      }

      // Convert frequency
      if (
        processedData.frequency &&
        typeof processedData.frequency === "string" &&
        frequencyFromJapanese[processedData.frequency]
      ) {
        processedData.frequency = frequencyFromJapanese[processedData.frequency];
      }

      // Set form values
      Object.entries(processedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          setValue(key as any, value);
        }
      });

      // Set auto save data after form values are set
      setAutoSaveData(processedData);
    },
    [setValue, setAutoSaveData, defectTypeFromJapanese, severityFromJapanese, frequencyFromJapanese],
  );

  // Use the stable function in useEffect - only run once when data is available
  useEffect(() => {
    const dataToPrefill = prefillData || initialData;
    if (dataToPrefill) {
      handlePrefill(dataToPrefill);
    }
  }, [prefillData, initialData]); // Remove handlePrefill from dependencies

  const watchedFields = watch();

  // Force convert Japanese values to enum values when form has Japanese data
  useEffect(() => {
    const needsConversion =
      (watchedFields.defect_types &&
        watchedFields.defect_types.some((type: any) => typeof type === "string" && defectTypeFromJapanese[type])) ||
      (watchedFields.severity &&
        typeof watchedFields.severity === "string" &&
        severityFromJapanese[watchedFields.severity]) ||
      (watchedFields.frequency &&
        typeof watchedFields.frequency === "string" &&
        frequencyFromJapanese[watchedFields.frequency]);

    if (needsConversion) {
      const convertedData = { ...watchedFields };

      // Convert defect_types
      if (convertedData.defect_types && Array.isArray(convertedData.defect_types)) {
        convertedData.defect_types = convertedData.defect_types.map((type: any) => {
          if (typeof type === "string" && defectTypeFromJapanese[type]) {
            return defectTypeFromJapanese[type];
          }
          return type;
        });
      }

      // Convert severity
      if (
        convertedData.severity &&
        typeof convertedData.severity === "string" &&
        severityFromJapanese[convertedData.severity]
      ) {
        convertedData.severity = severityFromJapanese[convertedData.severity];
      }

      // Convert frequency
      if (
        convertedData.frequency &&
        typeof convertedData.frequency === "string" &&
        frequencyFromJapanese[convertedData.frequency]
      ) {
        convertedData.frequency = frequencyFromJapanese[convertedData.frequency];
      }

      // Set converted values
      Object.entries(convertedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          setValue(key as any, value);
        }
      });
    }
  }, [
    watchedFields.defect_types,
    watchedFields.severity,
    watchedFields.frequency,
    setValue,
    defectTypeFromJapanese,
    severityFromJapanese,
    frequencyFromJapanese,
  ]);

  // Debug log for defect_types - removed to prevent console spam

  const onFormSubmit = (data: any) => {
    // Prevent submission if already loading
    if (isLoading) {
      return;
    }

    // Only submit at the final step
    if (currentStep === totalSteps) {
      onSubmit(data as ProblemInput, parentId || undefined);
      // Clear saved data after form submission
      localStorage.removeItem("problem-input-draft");
    } else {
      // Move to next step if not at final step
      nextStep();
    }
  };

  const onFormInvalid = (_errors: any) => {
    // Validation failed – form errors available in formState.errors
  };

  // Open example dialog
  const openExampleDialog = (type: "basic" | "fivem" | "investigation") => {
    setCurrentExampleType(type);
    setExampleDialogOpen(true);
  };

  // Apply example to form
  const applyExample = () => {
    if (currentExampleType === "basic") {
      Object.entries(exampleData.basic).forEach(([key, value]) => {
        setValue(key as keyof ProblemInput, value as any);
      });
    } else if (currentExampleType === "fivem") {
      Object.entries(exampleData.fivem).forEach(([key, value]) => {
        setValue(key as keyof ProblemInput, value as any);
      });
    } else if (currentExampleType === "investigation") {
      Object.entries(exampleData.investigation).forEach(([key, value]) => {
        setValue(key as keyof ProblemInput, value as any);
      });
    }
    setExampleDialogOpen(false);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return watchedFields.title?.trim() && watchedFields.description?.trim();
      case 2:
        return true; // 5M1E details and investigations are optional
      case 3:
        return true; // Final step
      default:
        return false;
    }
  };

  const stepTitles = ["基本情報・問題詳細", "分析情報・調査結果", "確認・送信"];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "text-red-600 bg-red-50 border-red-200";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "LOW":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div
      className="max-w-7xl mx-auto bg-gray-50 "
      suppressHydrationWarning
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              <span>初期情報インプット</span>
            </h1>
            <p className="text-gray-600 mt-1">
              <span>
                ステップ {currentStep} / {totalSteps}: {stepTitles[currentStep - 1]}
              </span>
            </p>
            {/* {renderAutoSaveStatus()} */}
          </div>

          {/* Desktop Progress Indicator */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="mr-6">
              <MuiSelect
                value={watchedFields?.language || ""}
                onChange={(e) => setValue("language", e?.target?.value)}
                displayEmpty
                className="h-9"
                IconComponent={(props) => (
                  <svg
                    {...props}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      transition: "transform 0.2s ease-in-out",
                    }}
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                )}
                input={
                  <OutlinedInput
                    startAdornment={
                      <InputAdornment
                        position="start"
                        sx={{ marginRight: 1 }}
                      >
                        <Globe className="w-4 h-4 text-gray-700" />
                      </InputAdornment>
                    }
                  />
                }
                sx={{
                  width: 140,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#d1d5db",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#646cff",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#3b82f6",
                    borderWidth: "1px",
                    boxShadow: "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))",
                    outline: "2px solid transparent",
                    outlineOffset: "2px",
                  },
                  "& .MuiSelect-icon": {
                    transition: "transform 0.2s ease-in-out",
                  },
                  "&.Mui-focused .MuiSelect-icon": {
                    transform: "rotate(180deg) translateY(50%)",
                  },
                }}
              >
                <MuiMenuItem
                  value=""
                  disabled
                  sx={{ display: "none" }}
                >
                  <span>言語を選択</span>
                </MuiMenuItem>
                {languageOptions?.map((lang) => (
                  <MuiMenuItem
                    key={lang?.value}
                    value={lang?.value}
                  >
                    {lang?.label}
                  </MuiMenuItem>
                ))}
              </MuiSelect>
            </div>

            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className="flex items-center"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step < currentStep
                      ? "bg-green-500 text-white"
                      : step === currentStep
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-16 h-1 mx-2 rounded transition-colors ${
                      step < currentStep ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-8">
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="space-y-8"
        >
          {/* Step 1: Basic Information & Problem Details */}
          <div
            key={currentStep === 1 ? "preview-step-1" : "not-preview-step-1"}
            className={`h-fit ${currentStep !== 1 ? "hidden" : ""}`}
          >
            {/* View example button */}
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => openExampleDialog("basic")}
                className="flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                <span>基本情報・問題詳細の入力例を見る</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Basic Information */}
              <Card className="">
                <CardHeader className="bg-blue-50 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <span>基本情報</span>
                  </CardTitle>
                  <CardDescription className="text-base">
                    <span>問題の基本的な情報を入力してください</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Problem Title */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="title"
                      className="text-base font-medium text-gray-700"
                    >
                      問題のタイトル <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...register("title")}
                      placeholder="例: 製品Aの塗装にムラが発生"
                      maxLength={500}
                      key="problem-title-input"
                      className={`h-12 text-base ${formState?.errors?.title ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`}
                    />
                    <div className="flex items-center justify-between">
                      {formState?.errors?.title ? (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span key={formState.errors.title.message}>{formState.errors.title.message}</span>
                        </div>
                      ) : (
                        <div></div>
                      )}
                      <div
                        className={`text-sm ${(watchedFields?.title?.length || 0) > 500 ? "text-red-600" : "text-gray-500"}`}
                      >
                        <span
                          translate="no"
                          key={watchedFields?.title?.length || 0}
                        >
                          {watchedFields?.title?.length || 0}{" "}
                        </span>
                        <span>/ 500</span>
                      </div>
                    </div>
                  </div>

                  {/* Product and Date Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label
                        htmlFor="product_name"
                        className="text-base font-medium text-gray-700"
                      >
                        製品名
                      </Label>
                      <Input
                        {...register("product_name")}
                        placeholder="例: 製品A"
                        className="h-12 text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="occurrence_date"
                        className="text-base font-medium text-gray-700"
                      >
                        発生日時
                      </Label>
                      <div>
                        <Controller
                          name="occurrence_date"
                          control={control}
                          render={({ field: { onChange, value, name, onBlur } }) => (
                            <DatePicker
                              selected={value ? new Date(value) : null}
                              onChange={(date) => onChange(date)}
                              onBlur={onBlur}
                              name={name}
                              showIcon
                              placeholderText="YYYY/MM/DD HH:mm"
                              dateFormat="yyyy/MM/dd HH:mm"
                              showTimeInput
                              timeInputLabel="Time:"
                              wrapperClassName="block"
                              toggleCalendarOnIconClick
                              calendarIconClassName="top-1/2 transform -translate-y-1/2"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Process and Location Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label
                        htmlFor="process"
                        className="text-base font-medium text-gray-700"
                      >
                        対象工程
                      </Label>
                      <Input
                        {...register("process")}
                        placeholder="例: 組み立て工程・ライン番号"
                        className="h-12 text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="location"
                        className="text-base font-medium text-gray-700"
                      >
                        発生場所
                      </Label>
                      <Input
                        {...register("location")}
                        placeholder="例: 第2工場・エリアA"
                        className="h-12 text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Severity Row - Language removed */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-medium text-gray-700">重要度</Label>
                      <MuiSelect
                        value={
                          watchedFields?.severity
                            ? severityFromJapanese[watchedFields.severity] || watchedFields.severity
                            : ""
                        }
                        onChange={(e) => setValue("severity", e?.target?.value as Severity)}
                        displayEmpty
                        className="h-12"
                        IconComponent={(props) => (
                          <svg
                            {...props}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          >
                            <path d="m6 9 6 6 6-6"></path>
                          </svg>
                        )}
                        sx={{
                          width: 262,
                          fontWeight: 500,
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#d1d5db",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#646cff",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#3b82f6",
                            borderWidth: "1px",
                            boxShadow: "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))",
                            outline: "2px solid transparent",
                            outlineOffset: "2px",
                          },
                          "& .MuiSelect-icon": {
                            transition: "transform 0.2s ease-in-out",
                          },
                          "&.Mui-focused .MuiSelect-icon": {
                            transform: "rotate(180deg) translateY(50%)",
                          },
                        }}
                      >
                        <MuiMenuItem
                          value=""
                          disabled
                          sx={{ display: "none" }}
                        >
                          <span>重要度を選択してください</span>
                        </MuiMenuItem>
                        <MuiMenuItem value={Severity.LOW}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-base">{severityLabels[Severity.LOW]}</span>
                          </div>
                        </MuiMenuItem>
                        <MuiMenuItem value={Severity.MEDIUM}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-base">{severityLabels[Severity.MEDIUM]}</span>
                          </div>
                        </MuiMenuItem>{" "}
                        <MuiMenuItem value={Severity.HIGH}>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-base">{severityLabels[Severity.HIGH]}</span>
                          </div>
                        </MuiMenuItem>
                      </MuiSelect>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Problem Details */}
              <Card className="h-fit">
                <CardHeader className="bg-blue-50 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <FileText className="w-6 h-6 text-blue-600" />
                    問題詳細
                  </CardTitle>
                  <CardDescription className="text-base">問題の詳細な状況と背景を記述してください</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Description */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="description"
                      className="text-base font-medium text-gray-700"
                    >
                      問題の詳細説明 <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      {...register("description")}
                      placeholder="問題の詳細な状況、現象、影響を具体的に記述してください"
                      rows={5}
                      className={`resize-none text-base ${formState?.errors?.description ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"}`}
                    />
                    {formState?.errors?.description && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {formState?.errors?.description.message}
                      </div>
                    )}
                  </div>

                  {/* Timeline Analysis */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="timeline_analysis"
                      className="text-base font-medium text-gray-700"
                    >
                      時系列分析
                    </Label>
                    <Textarea
                      {...register("timeline_analysis")}
                      placeholder="問題発生前後の時系列を記述してください（例：いつから、どのような順序で現象が発生したか）"
                      rows={4}
                      className="resize-none text-base border-gray-300 focus:border-blue-500"
                    />
                  </div>

                  {/* Frequency Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-medium text-gray-700">発生頻度</Label>
                      <MuiSelect
                        value={
                          watchedFields?.frequency
                            ? frequencyFromJapanese[watchedFields.frequency] || watchedFields.frequency
                            : ""
                        }
                        onChange={(e) => setValue("frequency", e?.target?.value as Frequency)}
                        displayEmpty
                        className="h-12"
                        IconComponent={(props) => (
                          <svg
                            {...props}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          >
                            <path d="m6 9 6 6 6-6"></path>
                          </svg>
                        )}
                        sx={{
                          width: 262,
                          fontWeight: 500,
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#d1d5db",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#646cff",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#3b82f6",
                            borderWidth: "1px",
                            boxShadow: "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))",
                            outline: "2px solid transparent",
                            outlineOffset: "2px",
                          },
                          "& .MuiSelect-icon": {
                            transition: "transform 0.2s ease-in-out",
                          },
                          "&.Mui-focused .MuiSelect-icon": {
                            transform: "rotate(180deg) translateY(50%)",
                          },
                        }}
                      >
                        <MuiMenuItem
                          value=""
                          disabled
                          sx={{ display: "none" }}
                        >
                          <span>発生頻度を選択</span>
                        </MuiMenuItem>
                        {Object.entries(frequencyLabels)?.map(([value, label]) => (
                          <MuiMenuItem
                            key={value}
                            value={value}
                          >
                            <span className="text-base">{label}</span>
                          </MuiMenuItem>
                        ))}
                      </MuiSelect>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="frequency_percentage"
                        className="text-base font-medium text-gray-700"
                      >
                        発生頻度の割合
                      </Label>
                      <div className="relative">
                        <Input
                          {...register("frequency_percentage")}
                          placeholder="例: 30"
                          className="h-12 text-base pr-12 border-gray-300 focus:border-blue-500"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-base">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Defect Types */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium text-gray-700">不具合分類</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(defectTypeLabels)?.map(([value, label]) => (
                        <div
                          key={value}
                          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <Checkbox
                            id={`defect-${value}`}
                            checked={
                              watchedFields?.defect_types?.includes(value as DefectType) ||
                              watchedFields?.defect_types?.some(
                                (type: any) => defectTypeFromJapanese[type] === value,
                              ) ||
                              false
                            }
                            onCheckedChange={(checked: boolean) => {
                              const currentTypes = watchedFields?.defect_types || [];
                              if (checked) {
                                setValue("defect_types", [...currentTypes, value as DefectType]);
                              } else {
                                setValue(
                                  "defect_types",
                                  currentTypes.filter(
                                    (type: any) => type !== value && defectTypeFromJapanese[type] !== value,
                                  ),
                                );
                              }
                            }}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label
                            htmlFor={`defect-${value}`}
                            className="text-base text-gray-700 cursor-pointer flex-1"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Other Defect Type */}
                    {(watchedFields?.defect_types?.includes(DefectType.OTHER) ||
                      watchedFields?.defect_types?.some(
                        (type: any) => defectTypeFromJapanese[type] === DefectType.OTHER,
                      )) && (
                      <div className="space-y-3">
                        <Label
                          htmlFor="other_defect_type"
                          className="text-base font-medium text-gray-700"
                        >
                          その他の不具合分類詳細
                        </Label>
                        <Input
                          {...register("other_defect_type")}
                          placeholder="その他の不具合分類を具体的に記述してください"
                          className="h-12 text-base border-gray-300 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Step 2: 5M1E Analysis & Investigation */}
          <div
            key={currentStep === 2 ? "preview-step-2" : "not-preview-step-2"}
            className={currentStep !== 2 ? "hidden" : ""}
          >
            {/* View example buttons */}
            <div className="flex justify-end gap-4 mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => openExampleDialog("fivem")}
                className="flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                <span>5M1E分析の入力例を見る</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openExampleDialog("investigation")}
                className="flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                <span>調査・検証の入力例を見る</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: 5M1E Analysis */}
              <Card>
                <CardHeader className="bg-blue-50 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Settings className="w-6 h-6 text-blue-600" />
                    5M1E分析
                  </CardTitle>
                  <CardDescription className="text-base">
                    Man（人）、Machine（機械）、Material（材料）、Method（方法）、Measurement（測定）、Environment（環境）の観点から分析してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <Label
                        htmlFor="man_details"
                        className="text-base font-medium text-gray-700 flex items-center gap-2"
                      >
                        👥 Man（人）
                      </Label>
                      <Textarea
                        {...register("man_details")}
                        placeholder="作業者のスキル、経験、体調、教育状況など"
                        rows={3}
                        className="resize-none text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="machine_details"
                        className="text-base font-medium text-gray-700 flex items-center gap-2"
                      >
                        ⚙️ Machine（機械）
                      </Label>
                      <Textarea
                        {...register("machine_details")}
                        placeholder="設備の状態、メンテナンス状況、故障履歴など"
                        rows={3}
                        className="resize-none text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="material_details"
                        className="text-base font-medium text-gray-700 flex items-center gap-2"
                      >
                        📦 Material（材料）
                      </Label>
                      <Textarea
                        {...register("material_details")}
                        placeholder="原材料の品質、ロット、保管状況など"
                        rows={3}
                        className="resize-none text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="method_details"
                        className="text-base font-medium text-gray-700 flex items-center gap-2"
                      >
                        📋 Method（方法）
                      </Label>
                      <Textarea
                        {...register("method_details")}
                        placeholder="作業手順、標準作業書、手順の変更など"
                        rows={3}
                        className="resize-none text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="measurement_details"
                        className="text-base font-medium text-gray-700 flex items-center gap-2"
                      >
                        📏 Measurement（測定）
                      </Label>
                      <Textarea
                        {...register("measurement_details")}
                        placeholder="測定器の校正、測定方法、データの精度など"
                        rows={3}
                        className="resize-none text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="environment_details"
                        className="text-base font-medium text-gray-700 flex items-center gap-2"
                      >
                        🌡️ Environment（環境）
                      </Label>
                      <Textarea
                        {...register("environment_details")}
                        placeholder="温度、湿度、騒音、照明、作業環境など"
                        rows={3}
                        className="resize-none text-base border-gray-300 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Investigation */}
              <Card>
                <CardHeader className="bg-blue-50 border-b">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    調査・検証
                  </CardTitle>
                  <CardDescription className="text-base">実施した調査や検証について記録してください</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Direct Cause */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="direct_cause"
                      className="text-base font-medium text-gray-700"
                    >
                      直接原因
                    </Label>
                    <Textarea
                      {...register("direct_cause")}
                      placeholder="問題の直接的な原因を記述してください"
                      rows={4}
                      className="resize-none text-base border-gray-300 focus:border-blue-500"
                    />
                  </div>

                  {/* Investigation Summary */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-700">調査・試験の概要</Label>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-3">
                        💡 実施した調査や試験の概要を記述してください。具体的な調査項目は後ほどAIが対話的に収集します。
                      </p>
                      <Textarea
                        {...register("investigations")}
                        placeholder="実施した調査・試験の概要があれば記述してください（例：材料分析を実施、設備点検を行った、など）"
                        rows={4}
                        className="resize-none text-base border-gray-300 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">調査・試験の結果</Label>
                          <Textarea
                            {...register("verification.result")}
                            placeholder="検証結果を入力してください"
                            rows={3}
                            className="mt-1 resize-none text-base border-gray-300 focus:border-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">調査・試験の実施者</Label>
                          <Input
                            {...register("verification.investigator")}
                            placeholder="実施者名を入力してください"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Summary */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-700">検証の概要</Label>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-3">🔬 原因の検証に関する概要があれば記述してください。</p>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">検証方法</Label>
                          <Input
                            {...register("verification.method")}
                            placeholder="検証方法を入力してください"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">検証結果</Label>
                          <Textarea
                            {...register("verification.content")}
                            placeholder="検証結果を入力してください"
                            rows={3}
                            className="mt-1 resize-none text-base border-gray-300 focus:border-blue-500 bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">検証日</Label>
                            <div className="relative">
                              <Controller
                                control={control}
                                name="verification.date"
                                render={({ field: { onChange, value, name, onBlur } }) => (
                                  <DatePicker
                                    selected={value ? new Date(value) : null}
                                    onChange={(date) => onChange(date)}
                                    onBlur={onBlur}
                                    name={name}
                                    showIcon
                                    placeholderText="YYYY/MM/DD"
                                    dateFormat="yyyy/MM/dd"
                                    wrapperClassName="block"
                                    toggleCalendarOnIconClick
                                    calendarIconClassName="top-1/2 transform -translate-y-1/2"
                                  />
                                )}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">検証者</Label>
                            <Input
                              {...register("verification.verifier")}
                              placeholder="検証者名を入力してください"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Step 3: Preview */}
          <div
            key={currentStep === 3 ? "preview-step-3" : "not-preview-step-3"}
            className={currentStep !== 3 ? "hidden" : ""}
          >
            <Card className="max-w-5xl mx-auto">
              <CardHeader className="bg-blue-50 border-b">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  <span>確認・プレビュー</span>
                </CardTitle>
                <CardDescription className="text-base">入力した内容を確認してください</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Problem Summary */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-lg border">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <span>問題概要</span>
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <p
                            key={watchedFields?.title || "problem-title"}
                            className="text-base font-medium text-gray-900 min-w-0 break-words whitespace-normal"
                          >
                            {watchedFields?.title || "未入力"}
                          </p>
                          <div
                            className={`${watchedFields?.severity ? "inline-flex" : "hidden"} items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-2 border ${getSeverityColor(watchedFields.severity || "")}`}
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span className={`${severityLabels[watchedFields.severity as Severity] ? "" : "hidden"}`}>
                              {severityLabels[watchedFields.severity as Severity]}
                            </span>
                            <span className={`${!severityLabels[watchedFields.severity as Severity] ? "" : "hidden"}`}>
                              {watchedFields.severity}
                            </span>
                          </div>
                        </div>

                        {watchedFields?.description && (
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 leading-relaxed min-w-0 break-words whitespace-normal">
                              {watchedFields.description}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-200">
                          <div
                            className={`${watchedFields?.product_name ? "" : "hidden"} flex items-center gap-2 text-sm`}
                          >
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 text-nowrap">製品:</span>
                            <span className="font-medium min-w-0 break-words whitespace-normal">
                              {watchedFields.product_name}
                            </span>
                          </div>

                          <div
                            className={`${watchedFields?.occurrence_date ? "" : "hidden"} flex items-center gap-2 text-sm`}
                          >
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">発生日:</span>
                            <span className="font-medium ">
                              {(() => {
                                try {
                                  if (!watchedFields.occurrence_date) return "";
                                  return new Date(watchedFields.occurrence_date).toLocaleDateString("ja-JP", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    timeZone: "Asia/Tokyo",
                                  });
                                } catch {
                                  return String(watchedFields.occurrence_date || "");
                                }
                              })()}
                            </span>
                          </div>

                          {watchedFields?.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 text-nowrap">場所:</span>
                              <span className="font-medium min-w-0 break-words whitespace-normal">
                                {watchedFields.location}
                              </span>
                            </div>
                          )}

                          {/* 分析言語の表示 */}
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">分析言語:</span>
                            <span className="font-medium 分析言語">
                              {languageOptions.find((l) => l?.value === watchedFields?.language)?.label || "日本語"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Defect Types */}
                    {watchedFields?.defect_types && watchedFields.defect_types.length > 0 && (
                      <div className="bg-gray-50 p-6 rounded-lg border">
                        <h4 className="font-medium text-gray-900 mb-3">不具合分類</h4>
                        <div className="flex flex-wrap gap-2">
                          {watchedFields.defect_types.map((type) => {
                            // Handle both enum values and Japanese strings
                            const displayLabel =
                              defectTypeLabels[type as DefectType] || defectTypeFromJapanese[type as string]
                                ? defectTypeLabels[defectTypeFromJapanese[type as string]]
                                : type;
                            return (
                              <span
                                key={type}
                                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                              >
                                {displayLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Analysis Info */}
                  <div className="space-y-6">
                    {/* 5M1E Summary */}
                    <div className="bg-gray-50 p-6 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        5M1E分析情報
                      </h4>
                      <div className="space-y-2 text-sm">
                        {[
                          { key: "man_details", label: "Man（人）" },
                          { key: "machine_details", label: "Machine（機械）" },
                          { key: "material_details", label: "Material（材料）" },
                          { key: "method_details", label: "Method（方法）" },
                          { key: "measurement_details", label: "Measurement（測定）" },
                          { key: "environment_details", label: "Environment（環境）" },
                        ].map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between py-1"
                          >
                            <span className="text-gray-600">{item.label}:</span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                (watchedFields as any)[item.key]
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <span className={`${(watchedFields as any)[item.key] ? "" : "hidden"}`}>入力済み</span>
                              <span className={`${(watchedFields as any)[item.key] ? "hidden" : ""}`}>未入力</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Next Steps */}
                    <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3">次のステップ</h4>
                      <div className="space-y-2 text-sm text-blue-800">
                        <p>✨ AIがなぜなぜ分析を開始します</p>
                        <p>💬 対話形式で分析を進めます</p>
                        <p>🌳 分析結果をツリー形式で可視化します</p>
                        <p>🎯 根本原因と対策を特定します</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200 max-w-5xl mx-auto">
            <Button
              type="button"
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 h-12 px-6 text-base"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>前のステップ</span>
            </Button>

            <div className="flex items-center gap-4">
              <span className="text-gray-500 text-base">
                <span>ステップ </span>
                <span key={`nav-step-${currentStep}`}>{currentStep} </span>
                <span> / {totalSteps}</span>
              </span>

              {currentStep === totalSteps ? (
                <Button
                  type="button"
                  disabled={isLoading || !canProceed()}
                  onClick={() => {
                    if (canProceed() && !isLoading) {
                      handleSubmit(onFormSubmit, onFormInvalid)();
                    }
                  }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 h-12 px-8 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className={`${parentId ? "" : "hidden"}`}>新しい分析セッション作成中</span>
                      <span className={`${parentId ? "hidden" : ""}`}>分析開始中</span>
                      {/* {parentId ? "新しい分析セッション作成中..." : "分析開始中..."} */}
                    </>
                  ) : (
                    <>
                      <TreePine className="w-5 h-5" />
                      <span className={`${parentId ? "" : "hidden"}`}>新しい分析セッション作成</span>
                      <span className={`${parentId ? "hidden" : ""}`}>分析開始</span>
                      {/* {parentId ? "新しい分析セッション作成" : "分析開始"} */}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 h-12 px-6 text-base"
                >
                  <span>次のステップ</span>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Example dialog */}
      <Dialog
        open={exampleDialogOpen}
        onOpenChange={setExampleDialogOpen}
      >
        <DialogContent className="max-w-5xl p-3">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              {currentExampleType === "basic" && "基本情報・問題詳細の入力例"}
              {currentExampleType === "fivem" && "5M1E分析の入力例"}
              {currentExampleType === "investigation" && "調査・検証の入力例"}
            </DialogTitle>
            <DialogDescription className="text-base">
              以下の入力例を参考にして、分析に必要な情報を記入してください。
            </DialogDescription>
          </DialogHeader>

          {currentExampleType === "basic" && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2">タイトル</h3>
                <p className="bg-white p-3 rounded border">{exampleData.basic.title}</p>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント: 製品名と問題の種類を簡潔に記載しましょう。「〜の〜が〜」という形式が分かりやすいです。
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2">問題詳細</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">{exampleData.basic.description}</div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント:
                  問題の現象、影響範囲、発見方法、時期などを具体的に記載しましょう。客観的な事実を中心に書くと分析しやすくなります。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-medium mb-2">基本情報例</h3>
                  <ul className="bg-white p-3 rounded border space-y-2">
                    <li>
                      <span className="font-medium">製品名:</span> {exampleData.basic.product_name}
                    </li>
                    <li>
                      <span className="font-medium">発生日時:</span>{" "}
                      {new Date(exampleData.basic.occurrence_date).toLocaleString("ja-JP")}
                    </li>
                    <li>
                      <span className="font-medium">対象工程:</span> {exampleData.basic.process}
                    </li>
                    <li>
                      <span className="font-medium">発生場所:</span> {exampleData.basic.location}
                    </li>
                    <li>
                      <span className="font-medium">重要度:</span> {severityLabels[exampleData.basic.severity]}
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-medium mb-2">発生状況例</h3>
                  <ul className="bg-white p-3 rounded border space-y-2">
                    <li>
                      <span className="font-medium">不具合分類:</span>{" "}
                      {defectTypeLabels[exampleData.basic.defect_types[0]]}
                    </li>
                    <li>
                      <span className="font-medium">発生頻度:</span> {frequencyLabels[exampleData.basic.frequency]}
                    </li>
                    <li>
                      <span className="font-medium">発生割合:</span> {exampleData.basic.frequency_percentage}%
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentExampleType === "fivem" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">👥 Man（人）の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">{exampleData.fivem.man_details}</div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント:
                  作業者の経験、教育状況、体調、シフト状況などの人的要因を記載しましょう。最近の変化があれば特に重要です。
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">⚙️ Machine（機械）の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">
                  {exampleData.fivem.machine_details}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント:
                  設備の種類、型番、設定値、メンテナンス状況、故障歴などを記載しましょう。数値データがあると分析の精度が上がります。
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">📦 Material（材料）の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">
                  {exampleData.fivem.material_details}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント:
                  材料の種類、ロット番号、特性値、保管状態、供給元などを記載しましょう。基準値との差異は特に重要です。
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">📋 Method（方法）の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">
                  {exampleData.fivem.method_details}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント: 作業手順、標準書の情報、最近の手順変更、作業条件などを記載しましょう。
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">📏 Measurement（測定）の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">
                  {exampleData.fivem.measurement_details}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント: 検査方法、測定器具、校正状況、判定基準、測定データなどを記載しましょう。
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">🌡️ Environment（環境）の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">
                  {exampleData.fivem.environment_details}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント:
                  温度、湿度、清浄度、照明、騒音など環境条件を記載しましょう。最近の変化や異常値があれば特に記載しましょう。
                </p>
              </div>
            </div>
          )}

          {currentExampleType === "investigation" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2">直接原因の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">
                  {exampleData.investigation.direct_cause}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント:
                  現時点で考えられる直接的な原因を記載しましょう。確証がなくても仮説を書くことで分析が進みます。複数の可能性がある場合はすべて記載しましょう。
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2">時系列分析の記入例</h3>
                <div className="bg-white p-3 rounded border whitespace-pre-line">
                  {exampleData.investigation.timeline_analysis}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ポイント:
                  問題発生前後の重要なイベントを時系列で記載しましょう。人員変更、材料ロット変更、設備メンテナンスなど、何らかの「変化」があった点に注目すると原因特定につながりやすくなります。
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExampleDialogOpen(false)}
            >
              閉じる
            </Button>
            <Button
              type="button"
              onClick={applyExample}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileDown className="w-4 h-4 mr-2" />
              この例をフォームに適用する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
