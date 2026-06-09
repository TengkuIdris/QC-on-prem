import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Formik, Form } from "formik";
import FormField from "./FormField";

const FormikWrapper = ({
  children,
  initialValues = {},
  onSubmit = () => {},
}: {
  children: React.ReactNode;
  initialValues: Record<string, any>;
  onSubmit: () => void;
}) => (
  <Formik
    initialValues={initialValues}
    onSubmit={onSubmit}
  >
    <Form>{children}</Form>
  </Formik>
);

describe("FormField", () => {
  const defaultProps = {
    name: "testField",
    type: "text" as const,
    touched: {},
    errors: {},
  };

  test("renders basic text input field", () => {
    render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField {...defaultProps} />
      </FormikWrapper>,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("displays label when provided", () => {
    const label = "Test Label";
    render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          label={label}
        />
      </FormikWrapper>,
    );

    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  test("handles password visibility toggle", () => {
    const setShowPassword = jest.fn();
    render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          type="password"
          showPassword={false}
          setShowPassword={setShowPassword}
        />
      </FormikWrapper>,
    );

    const toggleButton = screen.getByRole("button", {
      name: /toggle password visibility/i,
    });
    fireEvent.click(toggleButton);

    expect(setShowPassword).toHaveBeenCalled();
  });

  test("displays error message when field has error and is touched", () => {
    const errorMessage = "This field is required";
    render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          touched={{ testField: true }}
          errors={{ testField: errorMessage }}
        />
      </FormikWrapper>,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test("renders custom component when provided", () => {
    const CustomComponent = (props: any) => (
      <input
        data-testid="custom-input"
        {...props}
      />
    );
    render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          component={CustomComponent}
        />
      </FormikWrapper>,
    );

    expect(screen.getByTestId("custom-input")).toBeInTheDocument();
  });

  test("applies custom className to input", () => {
    const customClass = "custom-input-class";
    const { container } = render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          classNameInput={customClass}
        />
      </FormikWrapper>,
    );

    const inputContainer = container.querySelector(`.${customClass}`);
    expect(inputContainer).toBeInTheDocument();
  });

  test("displays placeholder text", () => {
    const placeholder = "Enter value here";
    render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          placeholder={placeholder}
        />
      </FormikWrapper>,
    );

    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  test("password field toggles between text and password type", () => {
    const { container } = render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          type="password"
          showPassword={false}
          setShowPassword={() => {}}
        />
      </FormikWrapper>,
    );

    const input = container.querySelector('input[name="testField"]');
    expect(input).toHaveAttribute("type", "password");
  });

  test("does not show error when field is untouched", () => {
    const errorMessage = "This field is required";
    render(
      <FormikWrapper
        initialValues={{}}
        onSubmit={() => {}}
      >
        <FormField
          {...defaultProps}
          touched={{}}
          errors={{ testField: errorMessage }}
        />
      </FormikWrapper>,
    );

    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });
});
