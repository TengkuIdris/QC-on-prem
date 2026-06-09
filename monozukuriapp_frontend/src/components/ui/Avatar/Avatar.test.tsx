import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import Avatar from "./Avatar";

test("Avatar renders with src and alt", () => {
  const { getByAltText } = render(
    <Avatar
      src="avatar.png"
      alt="User Avatar"
    />,
  );
  expect(getByAltText("User Avatar")).toBeInTheDocument();
  expect(getByAltText("User Avatar")).toHaveAttribute("src", "avatar.png");
});
