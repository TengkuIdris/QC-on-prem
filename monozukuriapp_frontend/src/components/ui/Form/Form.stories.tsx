import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Form, { FormProps } from "./Form";

export default {
  title: "UI/Form",
  component: Form,
} as Meta;

const Template: StoryFn<FormProps> = (args) => <Form {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  onSubmit: (formData) => console.log(formData),
};
