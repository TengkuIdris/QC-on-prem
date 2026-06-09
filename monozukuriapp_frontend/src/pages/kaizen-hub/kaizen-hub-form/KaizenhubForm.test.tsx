import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import KaizenhubForm from "./index";
import { Formik } from "formik";
import { TypeSubmit } from "@/enum/kaizenhub/typeSubmit";
import { fireEvent, waitFor } from "@testing-library/react";
import { validateSchema } from "../kaizen-hub-demo-post";

// Mock các components con
jest.mock("@/components/ui/Select/Select", () => {
  return function MockSelect() {
    return <div data-testid="mock-select">Select Component</div>;
  };
});

jest.mock("@/components/ui/MultipleInput/MultipleInput", () => {
  return function MockMultipleInput() {
    return <div data-testid="mock-multiple-input">Multiple Input Component</div>;
  };
});

jest.mock("@/components/ui/Input/InputFile", () => {
  return function MockInputFile({ text }: { text: string }) {
    return <div data-testid="mock-input-file">{text}</div>;
  };
});

describe("KaizenhubForm Component UI", () => {
  const mockProps = {
    setFieldValue: jest.fn(),
    values: [],
    setValues: jest.fn(),
    setErrors: jest.fn(),
    errors: {},
    setBeforeImagePreview: jest.fn(),
    setAfterImagePreview: jest.fn(),
    beforeImagePreview: null,
    afterImagePreview: null,
    isSubmitted: false,
    typeSubmit: { current: TypeSubmit.RECORD },
    handleScroll: jest.fn(),
    handleFileChange: jest.fn(),
    setValidateType: jest.fn(),
    validateType: {},
    errorLabel: undefined,
    setErrorLabel: jest.fn(),
    setFieldError: jest.fn(),
  };

  const renderKaizenhubForm = (props = mockProps) => {
    return render(
      <Formik
        initialValues={{}}
        onSubmit={() => {}}
      >
        <KaizenhubForm {...props} />
      </Formik>,
    );
  };

  describe("Header Section", () => {
    test("should render title and description", () => {
      renderKaizenhubForm();

      expect(screen.getByText("新しい改善レシピを投稿")).toBeInTheDocument();
      expect(screen.getByText("あなたの改善アイデアをシェアしましょう")).toBeInTheDocument();
    });
  });

  describe("Form Fields", () => {
    test("should render all input fields with labels", () => {
      renderKaizenhubForm();

      // Required fields
      expect(screen.getByText("タイトル")).toBeInTheDocument();
      expect(screen.getByText("概要")).toBeInTheDocument();
      expect(screen.getByText("カテゴリー")).toBeInTheDocument();
      expect(screen.getByText("タグ")).toBeInTheDocument();
      expect(screen.getByText("改善前の状況")).toBeInTheDocument();
      expect(screen.getByText("改善後の状況")).toBeInTheDocument();
      expect(screen.getByText("改善手順")).toBeInTheDocument();
      expect(screen.getByText("コツやポイント")).toBeInTheDocument();
    });

    test("should render all textareas with placeholders", () => {
      renderKaizenhubForm();

      expect(screen.getByPlaceholderText("改善レシピのタイトルを入力してください")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("改善レシピの概要を入力してください")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("改善前の問題点や状況を詳しく説明してください")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("改善後の結果や効果を詳しく説明してください")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("改善の具体的な手順や方法を箇条書きで説明してください")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("改善を成功させるためのコツやポイントがあれば記入してください"),
      ).toBeInTheDocument();
    });

    test("should render category select component", () => {
      renderKaizenhubForm();
      expect(screen.getByTestId("mock-select")).toBeInTheDocument();
    });

    test("should render tags input component", () => {
      renderKaizenhubForm();
      expect(screen.getByTestId("mock-multiple-input")).toBeInTheDocument();
    });
  });

  describe("Image Upload Section", () => {
    test("should render image upload fields", () => {
      renderKaizenhubForm();

      expect(screen.getByText("画像アップロード")).toBeInTheDocument();
      expect(screen.getByText("改善前の画像をドラッグ＆ドロップ")).toBeInTheDocument();
      expect(screen.getByText("改善後の画像をドラッグ＆ドロップ")).toBeInTheDocument();
    });

    test("should render file input components", () => {
      renderKaizenhubForm();
      const fileInputs = screen.getAllByTestId("mock-input-file");
      expect(fileInputs).toHaveLength(2);
    });
  });

  describe("Form Buttons", () => {
    test("should render submit buttons", () => {
      renderKaizenhubForm();

      expect(screen.getByText("下書き保存")).toBeInTheDocument();
      expect(screen.getByText("投稿内容の確認")).toBeInTheDocument();
    });

    test("should disable buttons when isSubmitted is true", () => {
      renderKaizenhubForm({
        ...mockProps,
        isSubmitted: true,
      });

      const draftButton = screen.getByText("下書き保存");
      const confirmButton = screen.getByText("投稿内容の確認");

      expect(draftButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe("Form Layout", () => {
    test("should render image upload grid layout", () => {
      renderKaizenhubForm();
      const imageGrid = screen.getByTestId("image-upload-grid");
      expect(imageGrid).toHaveClass("grid", "grid-cols-2", "gap-4");
    });
  });
});

describe("Form Validation", () => {
  const mockProps = {
    setFieldValue: jest.fn(),
    values: [],
    setValues: jest.fn(),
    setErrors: jest.fn(),
    errors: {},
    setBeforeImagePreview: jest.fn(),
    setAfterImagePreview: jest.fn(),
    beforeImagePreview: null,
    afterImagePreview: null,
    isSubmitted: false,
    typeSubmit: { current: TypeSubmit.RECORD },
    handleScroll: jest.fn(),
    handleFileChange: jest.fn(),
    setValidateType: jest.fn(),
    validateType: {},
    errorLabel: undefined,
    setErrorLabel: jest.fn(),
    setFieldError: jest.fn(),
  };

  const renderKaizenhubForm = (props = mockProps) => {
    return render(
      <Formik
        initialValues={{
          title: "",
          description: "",
          type: "",
          situationBeforeImprovement: "",
          situationAfterImprovement: "",
          improvementProcedures: "",
          tipsAndTricks: "",
          labels: [],
        }}
        validationSchema={validateSchema[TypeSubmit.RECORD]}
        onSubmit={jest.fn()}
      >
        <KaizenhubForm {...props} />
      </Formik>,
    );
  };

  describe("Title Validation", () => {
    test("should show error when title is less than 5 characters", async () => {
      renderKaizenhubForm();
      const titleInput = screen.getByPlaceholderText("改善レシピのタイトルを入力してください");

      fireEvent.change(titleInput, { target: { value: "test" } });
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(screen.getByText("タイトルは5文字以上で入力してください")).toBeInTheDocument();
      });
    });

    test("should show error when title exceeds 50 characters", async () => {
      renderKaizenhubForm();
      const titleInput = screen.getByPlaceholderText("改善レシピのタイトルを入力してください");

      fireEvent.change(titleInput, { target: { value: "a".repeat(51) } });
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(screen.getByText("タイトルは50文字以内で入力してください")).toBeInTheDocument();
      });
    });

    test("should show error when title is empty", async () => {
      renderKaizenhubForm();
      const titleInput = screen.getByPlaceholderText("改善レシピのタイトルを入力してください");

      fireEvent.change(titleInput, { target: { value: "" } });
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(screen.getByText("タイトルは必須です")).toBeInTheDocument();
      });
    });
  });

  describe("Description Validation", () => {
    test("should show error when description exceeds 1000 characters", async () => {
      renderKaizenhubForm();
      const descriptionInput = screen.getByPlaceholderText("改善レシピの概要を入力してください");

      fireEvent.change(descriptionInput, { target: { value: "a".repeat(1001) } });
      fireEvent.blur(descriptionInput);

      await waitFor(() => {
        expect(screen.getByText("概要は1000文字以内で入力してください")).toBeInTheDocument();
      });
    });

    test("should show error when description is empty", async () => {
      renderKaizenhubForm();
      const descriptionInput = screen.getByPlaceholderText("改善レシピの概要を入力してください");

      fireEvent.change(descriptionInput, { target: { value: "" } });
      fireEvent.blur(descriptionInput);

      await waitFor(() => {
        expect(screen.getByText("概要は必須です")).toBeInTheDocument();
      });
    });
  });

  describe("Category Validation", () => {
    test("should show error when category is not selected", async () => {
      renderKaizenhubForm();
      const submitButton = screen.getByText("投稿内容の確認");

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("カテゴリーは必須です")).toBeInTheDocument();
      });
    });
  });

  describe("Improvement Situations Validation", () => {
    test("should show error when situation after improvement exceeds 1000 characters", async () => {
      renderKaizenhubForm();
      const situationInput = screen.getByPlaceholderText("改善後の結果や効果を詳しく説明してください");

      fireEvent.change(situationInput, { target: { value: "a".repeat(1001) } });
      fireEvent.blur(situationInput);

      await waitFor(() => {
        expect(screen.getByText("改善後の状況は1000文字以内で入力してください")).toBeInTheDocument();
      });
    });

    test("should show error when situation after improvement is empty", async () => {
      renderKaizenhubForm();
      const situationInput = screen.getByPlaceholderText("改善後の結果や効果を詳しく説明してください");

      fireEvent.change(situationInput, { target: { value: "" } });
      fireEvent.blur(situationInput);

      await waitFor(() => {
        expect(screen.getByText("改善後の状況は必須です")).toBeInTheDocument();
      });
    });
  });

  describe("Improvement Procedures Validation", () => {
    test("should show error when procedures exceed 1000 characters", async () => {
      renderKaizenhubForm();
      const proceduresInput = screen.getByPlaceholderText("改善の具体的な手順や方法を箇条書きで説明してください");

      fireEvent.change(proceduresInput, { target: { value: "a".repeat(1001) } });
      fireEvent.blur(proceduresInput);

      await waitFor(() => {
        expect(screen.getByText("改善手順は1000文字以内で入力してください")).toBeInTheDocument();
      });
    });

    test("should show error when procedures is empty", async () => {
      renderKaizenhubForm();
      const proceduresInput = screen.getByPlaceholderText("改善の具体的な手順や方法を箇条書きで説明してください");

      fireEvent.change(proceduresInput, { target: { value: "" } });
      fireEvent.blur(proceduresInput);

      await waitFor(() => {
        expect(screen.getByText("改善手順は必須です")).toBeInTheDocument();
      });
    });
  });

  describe("Tips and Tricks Validation", () => {
    test("should show error when tips exceed 600 characters", async () => {
      renderKaizenhubForm();
      const tipsInput = screen.getByPlaceholderText("改善を成功させるためのコツやポイントがあれば記入してください");

      fireEvent.change(tipsInput, { target: { value: "a".repeat(601) } });
      fireEvent.blur(tipsInput);

      await waitFor(() => {
        expect(screen.getByText("コツやポイントは600文字以内で入力してください")).toBeInTheDocument();
      });
    });
  });
});
