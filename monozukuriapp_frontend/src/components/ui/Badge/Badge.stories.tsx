import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Badge from "./Badge";

export default {
  title: "UI/Badge",
  component: Badge,
} as Meta;

const Template: StoryFn<React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>>> = (
  args,
) => <Badge {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  color: "primary",
};

export const Success = Template.bind({});
Success.args = {
  color: "success",
};

export const Danger = Template.bind({});
Danger.args = {
  color: "danger",
};
