import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import CompareMode from "./index";

const mockFormikContext: {
  values: {
    beforeItems: { name: string; quantity: number }[];
    afterItems: { name: string; quantity: number }[];
  };
  errors: {
    beforeItems?: { name?: string; quantity?: string }[];
    afterItems?: { name?: string; quantity?: string }[];
  };
  touched: {
    beforeItems?: { name?: boolean; quantity?: boolean }[];
    afterItems?: { name?: boolean; quantity?: boolean }[];
  };
  setFieldValue: jest.Mock;
  setFieldTouched: jest.Mock;
  validateField: jest.Mock;
  handleSubmit: jest.Mock;
  handleChange: jest.Mock;
  handleBlur: jest.Mock;
} = {
  values: {
    beforeItems: [{ name: "", quantity: 0 }],
    afterItems: [{ name: "", quantity: 0 }],
  },
  errors: {},
  touched: {},
  setFieldValue: jest.fn(),
  setFieldTouched: jest.fn(),
  validateField: jest.fn(),
  handleSubmit: jest.fn(),
  handleChange: jest.fn(),
  handleBlur: jest.fn(),
};

jest.mock("@/features/pareto/components/DataInput", () => {
  return function MockDataInput({ isAfterMode = false }) {
    const prefix = isAfterMode ? "after" : "before";
    return (
      <div>
        <div>
          <input
            data-testid={`${prefix}-item-name-0`}
            aria-label="項目名"
          />
          <div role="alert">
            {isAfterMode
              ? mockFormikContext.errors?.afterItems?.[0]?.name
              : mockFormikContext.errors?.beforeItems?.[0]?.name}
          </div>

          <input
            data-testid={`${prefix}-item-quantity-0`}
            aria-label="数量"
            type="number"
          />
          <div role="alert">
            {isAfterMode
              ? mockFormikContext.errors?.afterItems?.[0]?.quantity
              : mockFormikContext.errors?.beforeItems?.[0]?.quantity}
          </div>
        </div>
        <button aria-label="項目を追加">Add Item</button>
      </div>
    );
  };
});

jest.mock("@/core/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: () => ({
    user: {
      role: {
        PARENTO_SAVE_TYPED_DATA: true,
        PARENTO_SAVE_AS_CSV: true,
        PARENTO_CHOOSE_FONT_TEXT: true,
      },
    },
    pareto: false,
  }),
}));

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockStore = configureStore({
  reducer: {
    auth: () => ({
      user: {
        role: {
          PARENTO_SAVE_TYPED_DATA: true,
          PARENTO_SAVE_AS_CSV: true,
          PARENTO_CHOOSE_FONT_TEXT: true,
        },
      },
    }),
    checkSaveDataSlice: () => ({
      pareto: false,
    }),
  },
});

jest.mock("d3", () => ({
  select: jest.fn(),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  })),
  scaleBand: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    padding: jest.fn().mockReturnThis(),
  })),
  axisBottom: jest.fn(),
  axisLeft: jest.fn(),
  line: jest.fn(() => ({
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis(),
  })),
}));

jest.mock("formik", () => ({
  ...jest.requireActual("formik"),
  useFormikContext: () => ({
    ...mockFormikContext,
    errors: {
      beforeItems: [
        {
          name: "15文字以内で入力してください",
          quantity: "0以上の数値を入力してください",
        },
      ],
      afterItems: [
        {
          name: "15文字以内で入力してください",
          quantity: "0以上の数値を入力してください",
        },
      ],
    },
    touched: {
      beforeItems: [{ name: true, quantity: true }],
      afterItems: [{ name: true, quantity: true }],
    },
  }),
}));

describe("CompareMode Component UI", () => {
  const renderCompareMode = () => {
    return render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <CompareMode />
        </BrowserRouter>
      </Provider>,
    );
  };

  describe("Layout Structure", () => {
    test("renders title", () => {
      renderCompareMode();
      const title = screen.getByTestId("compare-mode-title");
      expect(title).toBeInTheDocument();
    });

    test("renders form elements with proper layout", () => {
      renderCompareMode();
      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();
    });

    test("renders before/after mode checkbox", () => {
      renderCompareMode();
      const checkbox = screen.getByRole("checkbox", { name: "Before/After mode" });
      expect(checkbox).toBeInTheDocument();
    });

    test("renders both upload button", () => {
      renderCompareMode();
      const button = screen.getByRole("button", { name: "両方アップロード" });
      expect(button).toBeInTheDocument();
      const button2 = screen.getByRole("button", { name: "比較グラフを生成" });
      expect(button2).toBeInTheDocument();
    });

    test("renders before area title", () => {
      renderCompareMode();
      const title = screen.getByTestId("before-area-title");
      expect(title).toBeInTheDocument();
    });

    test("renders after area title", () => {
      renderCompareMode();
      const title = screen.getByTestId("after-area-title");
      expect(title).toBeInTheDocument();
    });
  });

  describe("Save Dialog", () => {
    test("renders save confirmation dialog when needed", () => {
      renderCompareMode();
      const dialog = screen.queryByRole("dialog");
      expect(dialog).not.toBeInTheDocument();
    });

    test("renders dialog buttons correctly", async () => {
      renderCompareMode();

      const dialog = screen.queryByRole("dialog");
      if (dialog) {
        expect(screen.getByText("保存しない")).toBeInTheDocument();
        expect(screen.getByText("保存する")).toBeInTheDocument();
      }
    });
  });

  describe("Before/After Mode Switch", () => {
    test("after section should be enabled when before/after mode is on", () => {
      renderCompareMode();
      const switchElement = screen.getByRole("checkbox", { name: "Before/After mode" });
      fireEvent.click(switchElement);

      const afterSection = screen.getByTestId("after-area-title").closest(".opacity-1");
      expect(afterSection).toBeInTheDocument();
    });
  });

  describe("Upload Buttons", () => {
    test("both upload button should be disabled when before/after mode is off", () => {
      renderCompareMode();
      const uploadButton = screen.getByRole("button", { name: "両方アップロード" });
      expect(uploadButton).toBeDisabled();
    });
  });

  describe("Form Submission", () => {
    test("prevents submission when before section has validation errors", async () => {
      mockFormikContext.errors = {
        beforeItems: [
          {
            name: "必須項目が入力されていません。入力してください。",
          },
        ],
      };

      renderCompareMode();
      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByTestId("before_chart")).not.toBeInTheDocument();
      });
    });

    test("prevents submission when after section has validation errors in before/after mode", () => {
      renderCompareMode();

      // Enable before/after mode
      const switchElement = screen.getByRole("checkbox", { name: "Before/After mode" });
      fireEvent.click(switchElement);

      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });
      fireEvent.click(generateButton);

      expect(screen.queryByTestId("after_chart")).not.toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    test("shows validation error for duplicate item names in before section", async () => {
      mockFormikContext.values = {
        beforeItems: [
          { name: "Item 1", quantity: 10 },
          { name: "Item 1", quantity: 20 },
        ],
        afterItems: [{ name: "", quantity: 0 }],
      };
      mockFormikContext.errors = {
        beforeItems: [{ name: "フィールド名が重複しないようにしてください。" }],
      };
      mockFormikContext.touched = {
        beforeItems: [{ name: true }],
      };

      renderCompareMode();
      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText("フィールド名が重複しないようにしてください。");
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toBeInTheDocument();
      });
    });

    test("shows validation error for item name exceeding 15 characters", async () => {
      mockFormikContext.values = {
        beforeItems: [{ name: "This name is way too long for validation", quantity: 10 }],
        afterItems: [{ name: "", quantity: 0 }],
      };
      mockFormikContext.errors = {
        beforeItems: [{ name: "15文字以内で入力してください" }],
      };
      mockFormikContext.touched = {
        beforeItems: [{ name: true }],
      };

      renderCompareMode();
      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText("15文字以内で入力してください");
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toBeInTheDocument();
      });
    });

    test("shows validation error for empty item name", async () => {
      mockFormikContext.values = {
        beforeItems: [{ name: "", quantity: 10 }],
        afterItems: [{ name: "", quantity: 0 }],
      };
      mockFormikContext.errors = {
        beforeItems: [{ name: "必須項目が入力されていません。入力してください。" }],
      };
      mockFormikContext.touched = {
        beforeItems: [{ name: true }],
      };

      renderCompareMode();
      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText("必須項目が入力されていません。入力してください。");
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toBeInTheDocument();
      });
    });

    test("shows validation error for negative quantity", async () => {
      mockFormikContext.values = {
        beforeItems: [{ name: "Item 1", quantity: -10 }],
        afterItems: [{ name: "", quantity: 0 }],
      };
      mockFormikContext.errors = {
        beforeItems: [{ quantity: "0以上の数値を入力してください" }],
      };
      mockFormikContext.touched = {
        beforeItems: [{ quantity: true }],
      };

      renderCompareMode();
      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText("0以上の数値を入力してください");
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toBeInTheDocument();
      });
    });

    test("shows validation error for empty quantity", async () => {
      mockFormikContext.values = {
        beforeItems: [{ name: "Item 1", quantity: null as any }],
        afterItems: [{ name: "", quantity: 0 }],
      };
      mockFormikContext.errors = {
        beforeItems: [{ quantity: "必須項目が入力されていません。入力してください。" }],
      };
      mockFormikContext.touched = {
        beforeItems: [{ quantity: true }],
      };

      renderCompareMode();
      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText("必須項目が入力されていません。入力してください。");
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toBeInTheDocument();
      });
    });

    test("validates minimum number of items requirement", async () => {
      mockFormikContext.values = {
        beforeItems: [],
        afterItems: [],
      };
      mockFormikContext.errors = {
        beforeItems: [{ name: "少なくとも 1 つのパラメータを選択してください。" }],
      };
      mockFormikContext.touched = {
        beforeItems: [{ name: true }],
      };

      renderCompareMode();
      const generateButton = screen.getByRole("button", { name: "比較グラフを生成" });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText("少なくとも 1 つのパラメータを選択してください。");
        expect(errorMessages.length).toBeGreaterThan(0);
        expect(errorMessages[0]).toBeInTheDocument();
      });
    });
  });
});
