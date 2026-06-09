import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Input from "./Input";

export default {
  title: "UI/Input",
  component: Input,
} as Meta;

const Template: StoryFn<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>> = (
  args,
) => <Input {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  value: "",
  onChange: (e) => console.log(e.target.value),
  placeholder: "Type something...",
};

export const Disabled = Template.bind({});
Disabled.args = {
  value: "",
  onChange: (e) => console.log(e.target.value),
  placeholder: "Type something...",
  disabled: true,
};
