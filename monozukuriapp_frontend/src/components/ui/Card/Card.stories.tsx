import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import { Card } from "./Card";

export default {
  title: "UI/Card",
  component: Card,
} as Meta;

const Template: StoryFn<React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>>> = (args) => (
  <Card {...args} />
);

export const Primary = Template.bind({});
Primary.args = {
  title: "Card Title",
  content: "This is the card content.",
};
