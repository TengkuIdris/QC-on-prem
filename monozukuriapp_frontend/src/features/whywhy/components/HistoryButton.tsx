import React from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@/enum/pathnames";

interface HistoryButtonProps {
  className?: string;
  label?: string;
}

function HistoryButton({ className, label = "履歴を見る" }: HistoryButtonProps) {
  const navigate = useNavigate();

  function onClick() {
    navigate(App.WHYWHY_HISTORY);
  }

  return (
    <button
      className={
        className || "w-full bg-amber-600 text-white rounded-md py-2 text-sm hover:bg-amber-700 transition-colors"
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default HistoryButton;
