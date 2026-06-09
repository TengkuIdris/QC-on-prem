import React, { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { BookOpen, ChevronUp, FileText, ExternalLink } from "lucide-react";
import type { RetrievedChunk } from "../types";

interface ReferenceCasesPanelProps {
  chunks?: RetrievedChunk[];
}

/**
 * 「参考事例」 panel — surfaces RAG-retrieved past cases and manuals.
 *
 * Hydrated from the `retrieve_context` SSE event emitted once early in a run.
 * Each entry shows the title + a snippet of the chunk text. When `source_id`
 * is present (RAG ingestion tagged the chunk with the NestJS case ID), the
 * title links to the existing internal-case detail route. Otherwise the entry
 * degrades to title + snippet with no link — see IMPLEMENTATION_SPEC.md C2.
 *
 * Renders nothing when there are no chunks.
 */
const ReferenceCasesPanel: React.FC<ReferenceCasesPanelProps> = ({ chunks }) => {
  const [opened, setOpened] = useState(true);

  if (!chunks || chunks.length === 0) {
    return null;
  }

  // RAG returns both 過去事例 and マニュアル interleaved; separate for display.
  const cases = chunks.filter((c) => c.source_type === "case");
  const manuals = chunks.filter((c) => c.source_type === "manual");

  return (
    <div className="flex-shrink-0">
      <Card className="relative">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            参考事例
            <span className="ml-2 rounded-full bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5">
              {chunks.length}件
            </span>
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
            {cases.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  過去事例
                </h4>
                <ul className="space-y-2">
                  {cases.map((chunk, idx) => (
                    <ChunkItem
                      key={`case-${idx}-${chunk.source_id ?? chunk.title ?? idx}`}
                      chunk={chunk}
                    />
                  ))}
                </ul>
              </div>
            )}
            {manuals.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  関連マニュアル
                </h4>
                <ul className="space-y-2">
                  {manuals.map((chunk, idx) => (
                    <ChunkItem
                      key={`manual-${idx}-${chunk.source_id ?? chunk.title ?? idx}`}
                      chunk={chunk}
                    />
                  ))}
                </ul>
              </div>
            )}
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

const SNIPPET_LIMIT = 200;

const ChunkItem: React.FC<{ chunk: RetrievedChunk }> = ({ chunk }) => {
  const title = chunk.title?.trim() || "(タイトルなし)";
  const text = (chunk.text ?? "").trim();
  const snippet = text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT)}…` : text;

  // Only "case" entries link out, and only if the RAG service provided a
  // routable source_id matching the NestJS case ID. Without one, fall back to
  // title + snippet (acceptable degraded mode per the spec).
  const canLink = chunk.source_type === "case" && !!chunk.source_id;
  const linkHref = canLink ? `/whywhy/internal-cases/${chunk.source_id}` : null;

  return (
    <li className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        {linkHref ? (
          <Link
            to={linkHref}
            className="text-sm font-medium text-blue-700 hover:underline flex items-center gap-1 min-w-0 break-words"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="break-words whitespace-normal">{title}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </Link>
        ) : (
          <span className="text-sm font-medium text-gray-800 break-words whitespace-normal">{title}</span>
        )}
        {typeof chunk.score === "number" && (
          <span className="text-xs text-gray-500 flex-shrink-0">類似度: {chunk.score.toFixed(2)}</span>
        )}
      </div>
      {snippet && (
        <p className="mt-1 text-xs text-gray-600 break-words whitespace-pre-wrap">{snippet}</p>
      )}
    </li>
  );
};

export default memo(ReferenceCasesPanel);
