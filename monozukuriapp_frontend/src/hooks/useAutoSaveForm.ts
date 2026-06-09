import { useState, useEffect, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface AutoSaveOptions<T = unknown> {
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  onSave?: (data: T) => Promise<void>;
  onError?: (error: Error) => void;
  validate?: (data: T) => boolean | string;
}

export interface AutoSaveFormReturn<T> {
  data: T;
  setData: (data: T | ((prev: T) => T)) => void;
  saveStatus: SaveStatus;
  error: Error | null;
  isDirty: boolean;
  reset: () => void;
  save: () => Promise<void>;
  validate: () => boolean | string;
}

export function useAutoSaveForm<T>(initialData: T, options: AutoSaveOptions<T> = {}): AutoSaveFormReturn<T> {
  const { debounceMs = 1000, maxRetries = 3, retryDelayMs = 1000, onSave, onError, validate: validateFn } = options;

  const [data, setData] = useState<T>(initialData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const originalDataRef = useRef<T>(initialData);
  const lastSavedDataRef = useRef<T>(initialData);

  // データが変更されたかどうかを追跡
  useEffect(() => {
    const hasChanged = JSON.stringify(data) !== JSON.stringify(originalDataRef.current);
    setIsDirty(hasChanged);
  }, [data]);

  // バリデーション関数
  const validateData = useCallback((): boolean | string => {
    if (!validateFn) return true;
    return validateFn(data);
  }, [validateFn, data]);

  // 保存関数
  const performSave = useCallback(async (): Promise<void> => {
    if (!onSave) return;

    const validationResult = validateData();
    if (validationResult !== true) {
      const errorMessage = typeof validationResult === "string" ? validationResult : "バリデーションエラー";
      const validationError = new Error(errorMessage);
      setError(validationError);
      setSaveStatus("error");
      onError?.(validationError);
      return;
    }

    setSaveStatus("saving");
    setError(null);

    try {
      await onSave(data);
      setSaveStatus("saved");
      setRetryCount(0);
      lastSavedDataRef.current = JSON.parse(JSON.stringify(data)); // Deep copy

      // 2秒後にidleに戻す
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error("保存に失敗しました");
      setError(saveError);

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        setTimeout(
          () => {
            performSave();
          },
          retryDelayMs * Math.pow(2, retryCount),
        );
      } else {
        setSaveStatus("error");
        onError?.(saveError);
      }
    }
  }, [data, onSave, validateData, retryCount, maxRetries, retryDelayMs, onError]);

  // デバウンスされた自動保存
  const debouncedSave = useDebouncedCallback(performSave, debounceMs);

  // データ変更時の自動保存
  useEffect(() => {
    if (isDirty && saveStatus !== "saving") {
      debouncedSave();
    }
  }, [data, isDirty, debouncedSave, saveStatus]);

  // 手動保存関数
  const save = useCallback(async (): Promise<void> => {
    debouncedSave.cancel(); // デバウンスをキャンセル
    await performSave();
  }, [debouncedSave, performSave]);

  // リセット関数
  const reset = useCallback(() => {
    setData(originalDataRef.current);
    setSaveStatus("idle");
    setError(null);
    setIsDirty(false);
    setRetryCount(0);
    debouncedSave.cancel();
  }, [debouncedSave]);

  // バリデーション関数
  const validateForm = useCallback((): boolean | string => {
    return validateData();
  }, [validateData]);

  return {
    data,
    setData,
    saveStatus,
    error,
    isDirty,
    reset,
    save,
    validate: validateForm,
  };
}

// フォームフィールドの状態管理用フック
export interface FormFieldState {
  value: string;
  error: string | null;
  isTouched: boolean;
  isValid: boolean;
}

export function useFormField(initialValue: string = "", validators: Array<(value: string) => string | null> = []) {
  const [state, setState] = useState<FormFieldState>({
    value: initialValue,
    error: null,
    isTouched: false,
    isValid: true,
  });

  const validateField = useCallback(
    (value: string): string | null => {
      for (const validator of validators) {
        const error = validator(value);
        if (error) return error;
      }
      return null;
    },
    [validators],
  );

  const setValue = useCallback(
    (value: string) => {
      const error = validateField(value);
      setState((prev) => ({
        ...prev,
        value,
        error,
        isValid: !error,
      }));
    },
    [validateField],
  );

  const setTouched = useCallback(
    (touched: boolean = true) => {
      setState((prev) => ({
        ...prev,
        isTouched: touched,
        error: touched ? validateField(prev.value) : null,
        isValid: !validateField(prev.value),
      }));
    },
    [validateField],
  );

  const reset = useCallback(() => {
    setState({
      value: initialValue,
      error: null,
      isTouched: false,
      isValid: true,
    });
  }, [initialValue]);

  return {
    ...state,
    setValue,
    setTouched,
    reset,
    validate: () => validateField(state.value),
  };
}

// バリデーション関数のユーティリティ
export const validators = {
  required:
    (message: string = "この項目は必須です") =>
    (value: string) =>
      value.trim() ? null : message,

  minLength: (min: number, message?: string) => (value: string) =>
    value.length >= min ? null : message || `${min}文字以上で入力してください`,

  maxLength: (max: number, message?: string) => (value: string) =>
    value.length <= max ? null : message || `${max}文字以下で入力してください`,

  email:
    (message: string = "有効なメールアドレスを入力してください") =>
    (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : message;
    },

  pattern: (regex: RegExp, message: string) => (value: string) => (regex.test(value) ? null : message),

  custom: (validator: (value: string) => string | null) => validator,
};
