import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Tooltip, { TooltipProps } from "./Tooltip";

export default {
  title: "UI/Tooltip",
  component: Tooltip,
} as Meta;

const Template: StoryFn<TooltipProps> = (args) => <Tooltip {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  text: "Tooltip text",
  children: "Hover over me",
};
