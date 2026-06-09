import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Alert, { AlertProps } from "./Alert";

export default {
  title: "UI/Alert",
  component: Alert,
} as Meta;

const Template: StoryFn<AlertProps> = (args) => <Alert {...args} />;

export const Info = Template.bind({});
Info.args = {
  message: "This is an info alert",
  type: "info",
};

export const Success = Template.bind({});
Success.args = {
  message: "This is a success alert",
  type: "success",
};

export const Error = Template.bind({});
Error.args = {
  message: "This is an error alert",
  type: "error",
};

export const Warning = Template.bind({});
Warning.args = {
  message: "This is a warning alert",
  type: "warning",
};
