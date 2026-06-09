import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import NodeComponent, { ReviewStatus } from "./index";
import chatService from "@/services/apis/chatService";
import fishboneService from "@/services/apis/fishboneService";

jest.mock("@/utils/eventEmitter", () => ({
  on: jest.fn(),
  removeListener: jest.fn(),
  emit: jest.fn(),
}));

jest.mock("@/services/apis/chatService", () => ({
  postNewMessage: jest.fn(),
}));

jest.mock("@/services/apis/fishboneService", () => ({
  reviewFishBone: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

jest.mock("@/utils/handleApi", () => ({
  handleApi: jest.fn((promise) => promise.then((res: any) => [res, null])),
}));

describe("NodeComponent", () => {
  const mockProps = {
    id: 1,
    name: "Test Node",
    level: 0,
    addChild: jest.fn(),
    removeNode: jest.fn(),
    updateTree: jest.fn(),
    resetRoot: jest.fn(),
    children: [],
    maxNode: 5,
    isSubmittedRef: { current: false },
    handleFormChange: jest.fn(),
    limitText: 255,
    queryIds: { current: [] },
    handleUpdateDiagrams: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    // @ts-ignore
    delete window.HTMLElement.prototype.scrollIntoView;
  });

  test("renders node with correct initial name", () => {
    render(<NodeComponent {...mockProps} />);
    expect(screen.getByText("Test Node")).toBeInTheDocument();
  });

  test("allows editing node name", () => {
    render(<NodeComponent {...mockProps} />);

    const editButton = screen.getByTestId("EditIcon").closest("button");
    fireEvent.click(editButton!);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Updated Node" } });
    fireEvent.blur(input);

    expect(mockProps.updateTree).toHaveBeenCalledWith({
      id: mockProps.id,
      name: "Updated Node",
      children: [],
      level: mockProps.level,
    });
  });

  test("handles adding child node", () => {
    render(<NodeComponent {...mockProps} />);

    const addButton = screen.getByTestId("AddIcon").closest("button");
    fireEvent.click(addButton!);

    expect(mockProps.addChild).toHaveBeenCalled();
    expect(mockProps.updateTree).toHaveBeenCalled();
  });

  test("shows alert when exceeding maxNode level", () => {
    const propsWithMaxLevel = {
      ...mockProps,
      level: 5,
    };

    render(<NodeComponent {...propsWithMaxLevel} />);

    const addButton = screen.getByTestId("AddIcon").closest("button");
    fireEvent.click(addButton!);

    expect(screen.getByText(/レベル5以上は追加できません/)).toBeInTheDocument();
  });

  test("validates node name length", () => {
    render(<NodeComponent {...mockProps} />);

    const editButton = screen.getByTestId("EditIcon").closest("button");
    fireEvent.click(editButton!);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "a".repeat(256) } });

    expect(screen.getByText(/255文字以内で入力してください/)).toBeInTheDocument();
  });

  test("handles review submission", async () => {
    const mockResponse = {
      data: {
        id: 123,
        response: "[]",
      },
    };

    const handleApiMock = jest.requireMock("@/utils/handleApi").handleApi;
    handleApiMock.mockImplementation(() => Promise.resolve([mockResponse, null]));

    const eventEmitMock = jest.requireMock("@/utils/eventEmitter").emit;

    (chatService.postNewMessage as jest.Mock).mockResolvedValue(mockResponse);
    (fishboneService.reviewFishBone as jest.Mock).mockResolvedValue({ data: "success" });

    const { rerender } = render(<NodeComponent {...mockProps} />);

    const chatIcon = screen.getByTestId("ChatIcon");
    fireEvent.click(chatIcon);

    expect(eventEmitMock).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    rerender(<NodeComponent {...mockProps} />);

    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("review-container")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const thumbsUpIcon = screen.getByTestId("thumbs-up-icon");
    fireEvent.click(thumbsUpIcon);

    await waitFor(() => {
      expect(fishboneService.reviewFishBone).toHaveBeenCalledWith({
        assistantId: 123,
        review: ReviewStatus.GOOD,
        reason: "",
      });
    });
  });
});
