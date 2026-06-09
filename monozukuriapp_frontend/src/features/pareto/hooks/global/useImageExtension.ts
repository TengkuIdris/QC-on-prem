import { create } from "zustand";
export type ImageExtension = "png" | "jpeg";

type ImageExtensionAction = {
  handleSelectImageExtension: (value: string) => void;
};

const parseImageExtension = (value: string): ImageExtension => {
  return value as ImageExtension;
};

export const useImageExtension = create<
  {
    imageExtension: ImageExtension;
  } & ImageExtensionAction
>((set) => ({
  imageExtension: "png",
  handleSelectImageExtension: (value: string) => {
    const parsedValue = parseImageExtension(value);
    set({ imageExtension: parsedValue });
  },
}));
