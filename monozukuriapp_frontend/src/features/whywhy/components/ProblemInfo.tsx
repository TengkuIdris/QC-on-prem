import React, { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { BarChart3, ChevronUp } from "lucide-react";
import { useAppSelector } from "@/core/hooks";
import type { AnalysisSession } from "../types";
import { getTextStatus } from "@/helpers/getTextStatus";

interface ProblemInfoProps {
  session: AnalysisSession | null;
  fromInternalCases?: boolean;
}

const ProblemInfo: React.FC<ProblemInfoProps> = ({ session, fromInternalCases = false }) => {
  const [opened, setOpened] = useState(true);
  const user = useAppSelector((state) => state.auth.user);
  
  // Get owner information from session, fallback to current user if not available
  const owner = typeof session?.owner === "object" ? session.owner : null;
  const reporterName = owner 
    ? (owner.full_name || owner.name || owner.email || "")
    : (user?.full_name || user?.name || user?.email || "");
  
  // Hide reporter name if coming from internal cases and hide_author_name is true
  const shouldHideReporter = fromInternalCases && (session?.hideAuthorName === true );

  return (
    <div className="flex-shrink-0">
      <Card className="relative">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            入力情報
          </CardTitle>
        </CardHeader>
        <div
          className={`transition-all duration-300 ${
            opened
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 max-h-0 overflow-hidden transform -translate-y-2"
          }`}
        >
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm transition-all duration-500">
              <div>
                <span className="font-semibold text-gray-600 ">問題タイトル:</span>{" "}
                <span className="min-w-0 break-words whitespace-normal">{session?.title}</span>
              </div>
              {!shouldHideReporter && (
                <div>
                  <span className="font-semibold text-gray-600">報告者:</span>{" "}
                  {reporterName || "N/A"}
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-600">発生日時:</span>{" "}
                {session?.createdAt && new Date(session?.createdAt).toLocaleString("ja-JP")}
              </div>
              <div>
                <span className="font-semibold text-gray-600">ステータス:</span>{" "}
                {session?.status && getTextStatus(session?.status)}
              </div>
              <div>
                <span className="font-semibold text-gray-600">対象工程:</span>{" "}
                <span className="min-w-0 break-words whitespace-normal">
                  {session?.analysisData?.problem?.process ?? "N/A"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">発生場所:</span>{" "}
                <span className="min-w-0 break-words whitespace-normal">
                  {session?.analysisData?.problem?.location ?? "N/A"}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-600">問題詳細:</span>
                <p className="mt-1 min-w-0 break-words whitespace-normal">
                  {session?.analysisData?.problem?.description ?? "詳細情報がありません"}
                </p>
              </div>
            </div>
          </CardContent>
        </div>
        <ChevronUp
          className={`absolute bottom-2 right-2 cursor-pointer transition-all duration-300 hover:bg-gray-100 rounded-full ${
            opened ? "rotate-0" : "rotate-180"
          }`}
          onClick={() => setOpened(!opened)}
        />
      </Card>
    </div>
  );
};

export default memo(ProblemInfo);
