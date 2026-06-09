import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Spinner from "./Spinner";

export default {
  title: "UI/Spinner",
  component: Spinner,
} as Meta;

const Template: StoryFn = (args) => <Spinner {...args} />;

export const Primary = Template.bind({});
Primary.args = {};
