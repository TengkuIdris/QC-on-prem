import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Dropdown, { DropdownProps } from "./Dropdown";

export default {
  title: "UI/Dropdown",
  component: Dropdown,
} as Meta;

const Template: StoryFn<DropdownProps> = (args) => <Dropdown {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  options: ["Option 1", "Option 2", "Option 3"],
  onSelect: (option) => console.log(option),
};
