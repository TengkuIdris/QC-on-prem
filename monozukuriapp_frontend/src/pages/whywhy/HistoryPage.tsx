import React from "react";
import ThreadListFull from "@/features/whywhy/components/ThreadListFull";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function HistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          onClick={() => navigate("/whywhy")}
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          分析履歴に戻る
        </Button>
      </div>
      <div className="text-xl font-semibold mb-4">分析履歴</div>
      <ThreadListFull />
    </div>
  );
}

export default HistoryPage;
