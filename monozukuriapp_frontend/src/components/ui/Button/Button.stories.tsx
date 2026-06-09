import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Button from "./Button";

export default {
  title: "UI/Button",
  component: Button,
} as Meta;

const Template: StoryFn<
  React.FC<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>>
> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: "Click me",
  onClick: () => alert("Button clicked"),
};

export const Disabled = Template.bind({});
Disabled.args = {
  children: "Click me",
  onClick: () => alert("Button clicked"),
  disabled: true,
};
