import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Table, { TableProps } from "./Table";

export default {
  title: "UI/Table",
  component: Table,
} as Meta;

const Template: StoryFn<TableProps> = (args) => <Table {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  data: [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
  ],
};
