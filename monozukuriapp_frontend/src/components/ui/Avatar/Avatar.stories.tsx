import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Avatar from "./Avatar";

export default {
  title: "UI/Avatar",
  component: Avatar,
} as Meta;

const Template: StoryFn<
  React.FC<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>>
> = (args) => <Avatar {...args} />;

export const Small = Template.bind({});
Small.args = {
  src: "avatar.png",
};

export const Medium = Template.bind({});
Medium.args = {
  src: "avatar.png",
};

export const Large = Template.bind({});
Large.args = {
  src: "avatar.png",
};
