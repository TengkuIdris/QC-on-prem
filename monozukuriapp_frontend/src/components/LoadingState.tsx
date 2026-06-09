import React from "react";
import LoadingSpinner from "./LoadingSpinner";
import LoadingSkeleton from "./LoadingSkeleton";

interface LoadingStateProps {
  isLoading: boolean;
  type?: "spinner" | "skeleton";
  skeletonType?: "form" | "content" | "list" | "card";
  skeletonRows?: number;
  message?: string;
  overlay?: boolean;
  children: React.ReactNode;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  type = "spinner",
  skeletonType = "content",
  skeletonRows = 3,
  message,
  overlay = false,
  children,
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  if (type === "skeleton") {
    return (
      <LoadingSkeleton
        type={skeletonType}
        rows={skeletonRows}
      />
    );
  }

  // Default to spinner
  return (
    <>
      <LoadingSpinner
        overlay={overlay}
        message={message}
        size="large"
      />
      {!overlay && children}
    </>
  );
};

export default LoadingState;
