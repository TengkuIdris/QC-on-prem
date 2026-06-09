import React from "react";
import { StoryFn, Meta } from "@storybook/react";
import Modal, { ModalProps } from "./Modal";

export default {
  title: "UI/Modal",
  component: Modal,
} as Meta;

const Template: StoryFn<ModalProps> = (args) => <Modal {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  isOpen: true,
  onClose: () => console.log("Modal closed"),
  title: "Modal Title",
  children: "This is the modal content.",
};
