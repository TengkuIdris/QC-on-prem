import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Card } from "./Card";

test("Card renders with title and content", () => {
  const { getByText } = render(
    <Card
      title="Card Title"
      content="Card content"
    />,
  );
  expect(getByText("Card Title")).toBeInTheDocument();
  expect(getByText("Card content")).toBeInTheDocument();
});
