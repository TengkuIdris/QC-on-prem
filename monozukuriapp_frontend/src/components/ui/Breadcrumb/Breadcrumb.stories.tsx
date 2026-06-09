import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Breadcrumb, { BreadcrumbProps } from "./Breadcrumb";

export default {
  title: "UI/Breadcrumb",
  component: Breadcrumb,
} as Meta;

const Template: StoryFn<BreadcrumbProps> = (args) => <Breadcrumb {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  items: [{ text: "Home", href: "/" }, { text: "Category", href: "/category" }, { text: "Item" }],
};
