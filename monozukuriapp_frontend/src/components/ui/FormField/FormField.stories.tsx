import * as React from "react";
import { useState } from "react";
import { Meta, StoryObj } from "@storybook/react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import FormField from "./FormField";

const meta = {
  title: "UI/FormField",
  component: FormField,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "400px", padding: "20px" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper để cung cấp context Formik
const FormikWrapper = ({ children }: { children: React.ReactNode }) => {
  const validationSchema = Yup.object({
    testField: Yup.string().required("This field is required"),
  });

  return (
    <Formik
      initialValues={{ testField: "" }}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        console.log(values);
      }}
    >
      <Form>{children}</Form>
    </Formik>
  );
};

// Story cơ bản
export const Basic: Story = {
  args: {
    name: "testField",
    label: "Basic Input",
    type: "text",
    touched: {},
    errors: {},
  },
  render: (args) => (
    <FormikWrapper>
      <FormField {...args} />
    </FormikWrapper>
  ),
};

// Story với placeholder
export const WithPlaceholder: Story = {
  args: {
    name: "testField",
    label: "Input with Placeholder",
    type: "text",
    placeholder: "Enter some text...",
    touched: {},
    errors: {},
  },
  render: (args) => (
    <FormikWrapper>
      <FormField {...args} />
    </FormikWrapper>
  ),
};

// Story với error message
export const WithError: Story = {
  args: {
    name: "testField",
    label: "Input with Error",
    type: "text",
    touched: { testField: true },
    errors: { testField: "This field is required" },
  },
  render: (args) => (
    <FormikWrapper>
      <FormField {...args} />
    </FormikWrapper>
  ),
};

// Story với password field
export const PasswordField: Story = {
  args: {
    name: "testField",
    label: "Password Input",
    type: "password",
    touched: {},
    errors: {},
  },
  render: (args) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
      <FormikWrapper>
        <FormField
          {...args}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />
      </FormikWrapper>
    );
  },
};

// Story với custom className
export const WithCustomClass: Story = {
  args: {
    name: "testField",
    label: "Custom Styled Input",
    type: "text",
    classNameInput: "custom-input-class",
    touched: {},
    errors: {},
  },
  render: (args) => (
    <FormikWrapper>
      <FormField {...args} />
    </FormikWrapper>
  ),
};

// Story với initial value
export const WithInitialValue: Story = {
  args: {
    name: "testField",
    label: "Input with Initial Value",
    type: "text",
    touched: {},
    errors: {},
  },
  render: (args) => (
    <Formik
      initialValues={{ testField: "Initial Value" }}
      onSubmit={console.log}
    >
      <Form>
        <FormField {...args} />
      </Form>
    </Formik>
  ),
};

// Story với disabled state
export const Disabled: Story = {
  args: {
    name: "testField",
    label: "Disabled Input",
    type: "text",
    touched: {},
    errors: {},
    disabled: true,
  },
  render: (args) => (
    <FormikWrapper>
      <FormField {...args} />
    </FormikWrapper>
  ),
};

// Story với full width
export const FullWidth: Story = {
  args: {
    name: "testField",
    label: "Full Width Input",
    type: "text",
    touched: {},
    errors: {},
    style: { width: "100%" },
  },
  render: (args) => (
    <FormikWrapper>
      <FormField {...args} />
    </FormikWrapper>
  ),
};
