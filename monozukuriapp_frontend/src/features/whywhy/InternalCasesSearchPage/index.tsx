import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Search } from "lucide-react";
import whyWhyApiClient from "@/services/apis/whyWhyService";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import {
  Container,
  Typography,
  CircularProgress,
  Input,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Button as MuiButton,
} from "@mui/material";
import { toast } from "react-toastify";

interface InternalCase {
  thread_id: string;
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner: {
    id: number;
    name: string;
    email: string;
    full_name: string | null;
    department: string | null;
    affiliation: string | null;
    company: string | null;
    company_id: number | null;
  };
  problem: {
    title?: string;
    description?: string;
  };
  description: string | null;
  publicScope?: string;
  hideAuthorName?: boolean;
}

const InternalCasesSearchPage: React.FC = () => {
  const [cases, setCases] = useState<InternalCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const isComposingRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const pageSize = 10;

  useEffect(() => {
    setBreadcrumbItems([
      { label: "なぜなぜ分析", href: "#", onClick: () => navigate("/whywhy") },
      { label: "社内の分析事例", href: "#", onClick: () => null },
    ]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems, navigate]);

  // Restore search state from navigation (when navigating back from detail page)
  const isRestoringStateRef = useRef(false);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const searchState = location.state?.searchState;

    if (searchState && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      isRestoringStateRef.current = true;

      // Restore all state values
      const restoredSearchInput = searchState.searchInput || "";
      const restoredSearchTerm = searchState.searchTerm || "";
      const restoredCurrentPage = searchState.currentPage || 1;

      // Set all values together to avoid triggering debounce effect
      // Use a callback to batch state updates
      setSearchInput(restoredSearchInput);
      setSearchTerm(restoredSearchTerm);
      setCurrentPage(restoredCurrentPage);

      // Don't clear state immediately - wait for React to update the UI
      // Use multiple requestAnimationFrame to ensure state is fully applied
      // Also wait for the next render cycle to complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Wait for React to commit the state update
          setTimeout(() => {
            // Only clear state after ensuring UI has updated
            navigate(location.pathname, { replace: true, state: {} });
            // Reset flag after a delay to allow state updates to complete
            setTimeout(() => {
              isRestoringStateRef.current = false;
            }, 200);
          }, 500); // Increased delay to ensure state is set and UI is updated
        });
      });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    fetchCases(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (searchInput.length === 0 && searchTerm !== "") {
      const timer = setTimeout(() => {
        if (!isComposingRef.current) {
          setSearchTerm("");
          setCurrentPage(1);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchInput, searchTerm]);

  const fetchCases = async (page: number, search: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await whyWhyApiClient.getInternalCases(page, pageSize, search, "completed");

      // Handle response structure: response.data.data or response.data
      const responseData: any = response?.data?.data || response?.data;

      // Check if responseData is an object with data property
      if (
        responseData &&
        typeof responseData === "object" &&
        !Array.isArray(responseData) &&
        responseData.data &&
        Array.isArray(responseData.data)
      ) {
        // Response structure: { data: [...], meta: {...} }
        const data = responseData.data as any[];
        const meta = responseData.meta as any;
        setCases(data);
        setTotalPages(meta?.totalPages || 1);
        setTotalItems(meta?.total || 0);
      } else if (Array.isArray(responseData)) {
        // Response structure: [...]
        setCases(responseData);
        setTotalPages(1);
        setTotalItems(responseData.length);
      } else {
        // If no data, set empty array
        setCases([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err: any) {
      console.error("Error fetching internal cases:", err);
      const errorMessage = err?.response?.data?.error || err?.message || "社内事例の取得に失敗しました。";
      setError(errorMessage);
      toast.error(errorMessage);
      // Set empty state on error
      setCases([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger search immediately when user clicks search icon or presses Enter
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString("ja-JP", {
  //     year: "numeric",
  //     month: "2-digit",
  //     day: "2-digit",
  //   });
  // };

  // const formatDateTime = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleString("ja-JP", {
  //     year: "numeric",
  //     month: "2-digit",
  //     day: "2-digit",
  //     hour: "2-digit",
  //     minute: "2-digit",
  //   });
  // };

  const handleCaseClick = (caseId: string) => {
    // Navigate directly to WhyWhyAnalysisView (chat 5W page) with full interface
    // Save current search state to restore when returning
    const stateToPass = {
      fromInternalCases: true,
      returnPath: "/whywhy/internal-cases",
      searchState: {
        searchTerm: searchTerm,
        currentPage: currentPage,
        searchInput: searchInput,
      },
    };

    navigate(`/whywhy/view/${caseId}`, {
      state: stateToPass,
    });
  };

  // Truncate text to max length and return full text for tooltip
  const truncateText = (text: string, maxLength: number = 50): { display: string; full: string } => {
    if (!text) return { display: "", full: "" };
    if (text.length <= maxLength) return { display: text, full: text };
    return { display: `${text.substring(0, maxLength)}...`, full: text };
  };

  // Highlight search keywords in text
  const highlightText = (text: string, keyword: string, uniqueId?: string): React.ReactNode => {
    if (!keyword || !text) {
      const key = uniqueId ? `text-${uniqueId}` : `text-${text.substring(0, 10)}-${Date.now()}`;
      return <span key={key}>{text}</span>;
    }

    // If keyword is purely numeric (e.g., "4", "6"), avoid regex/highlight to prevent
    // any edge-case issues with browser translate extensions manipulating the DOM
    if (/^\d+$/.test(keyword)) {
      const key = uniqueId ? `text-${uniqueId}` : `text-${text.substring(0, 10)}-${Date.now()}`;
      return <span key={key}>{text}</span>;
    }

    try {
      // Escape keyword for use in RegExp to avoid errors with special characters like [, \, ?, *, (, ), +
      // This also handles numbers like 4, 6 safely
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parts = text.split(new RegExp(`(${escapedKeyword})`, "gi"));

      const baseKey = uniqueId || text.substring(0, 10);
      return parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark
            key={`highlight-${baseKey}-${index}`}
            style={{ backgroundColor: "#ffeb3b", padding: "0 2px" }}
          >
            <span key={`mark-text-${baseKey}-${index}`}>{part}</span>
          </mark>
        ) : (
          <span key={`text-${baseKey}-${index}`}>{part}</span>
        ),
      );
    } catch (error) {
      // If regex fails for any reason (including edge cases with numbers), just return text without highlighting
      console.warn("Error highlighting text:", error);
      const key = uniqueId ? `text-${uniqueId}` : `text-${text.substring(0, 10)}-${Date.now()}`;
      return <span key={key}>{text}</span>;
    }
  };

  // Calculate pagination display (max 10 pages)
  const getPaginationPages = () => {
    if (totalPages <= 10) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    // Show first 5, last 5, and current page area
    const pages: (number | string)[] = [];
    if (currentPage <= 5) {
      // Show first 7 pages, then "...", then last 2
      for (let i = 1; i <= 7; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages - 1);
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 4) {
      // Show first 2, then "...", then last 7 pages
      pages.push(1);
      pages.push(2);
      pages.push("...");
      for (let i = totalPages - 6; i <= totalPages; i++) pages.push(i);
    } else {
      // Show first 2, "...", current area (3 pages), "...", last 2
      pages.push(1);
      pages.push(2);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages - 1);
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <Container
      maxWidth={false}
      sx={{ pt: 6, pb: 4 }}
    >
      <div className="mb-6">
        {/* Search Section */}
        <Typography
          variant="h6"
          component="h2"
          sx={{ mb: 2, fontWeight: 700 }}
        >
          <span key="search-title">フリーワードで探す</span>
        </Typography>
        <form
          onSubmit={handleSearch}
          className="mb-6"
        >
          <div className="flex gap-3 w-full items-center">
            <div className="flex-1">
              <Input
                key={`search-input-${hasRestoredRef.current ? "restored" : "default"}`}
                fullWidth
                placeholder="部品名・工程・キーワードで検索"
                value={searchInput || ""}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                }}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposingRef.current) {
                    e.preventDefault();
                    handleSearch(e as any);
                  }
                }}
                sx={{
                  py: 1,
                  pr: "40px",
                  pl: "15px",
                  borderRadius: 1,
                  border: "1px solid #e5e7eb",
                  "&:hover": {
                    borderColor: "#4B73FF",
                  },
                  "&.Mui-focused": {
                    borderColor: "#4B73FF",
                  },
                }}
              />
            </div>

            <MuiButton
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<Search className="h-4 w-4" />}
              sx={{
                minWidth: "110px",
                textTransform: "none",
                backgroundColor: "#2A4073",
                fontWeight: 600,
                height: "48px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                "&:hover": {
                  backgroundColor: "#39528A",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
                },
              }}
            >
              検索
            </MuiButton>
          </div>
        </form>
      </div>

      {/* Results */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Typography color="error">
            <span key="error-text">{error}</span>
          </Typography>
        </div>
      )}

      {isLoading && cases.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <CircularProgress />
        </div>
      ) : cases.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <div className="flex flex-col items-center justify-center py-8">
            <img
              src="/image/no_data.svg"
              alt="No data"
              className="mb-4"
              style={{ width: "200px", height: "200px" }}
            />
            <Typography
              variant="body1"
              color="text.secondary"
            >
              <span key="no-results-text">
                {searchTerm ? "検索結果が見つかりませんでした。" : "社内事例がまだありません。"}
              </span>
            </Typography>
          </div>
        </Paper>
      ) : (
        <>
          <div className="mb-4">
            <Typography
              variant="body2"
              color="text.secondary"
            >
              <span key={totalItems || "results-count"}>
                {totalItems}
                {` `}件の事例が見つかりました
              </span>
              <span></span>
            </Typography>
          </div>

          <TableContainer
            component={Paper}
            sx={{ mb: 4 }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <span key="header-title">タイトル</span>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <span key="header-affiliation">所属</span>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <span key="header-author">作成者</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((caseItem) => {
                  const titleText = truncateText(caseItem.title, 50);
                  const authorName = caseItem.hideAuthorName
                    ? "-"
                    : caseItem.owner.full_name || caseItem.owner.name || "";
                  const authorText = truncateText(authorName, 50);

                  return (
                    <TableRow
                      key={caseItem.thread_id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => handleCaseClick(caseItem.thread_id)}
                    >
                      <TableCell>
                        <Tooltip
                          title={titleText.full}
                          arrow
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500 }}
                          >
                            {searchTerm ? (
                              highlightText(titleText.display, searchTerm, `title-${caseItem.thread_id}`)
                            ) : (
                              <span key={`title-${caseItem.thread_id}`}>{titleText.display}</span>
                            )}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          <span key={`affiliation-${caseItem.thread_id}`}>{caseItem.owner.affiliation || "-"}</span>
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={authorText.full}
                          arrow
                        >
                          <Typography variant="body2">
                            {searchTerm && !caseItem.hideAuthorName ? (
                              highlightText(authorText.display, searchTerm, `author-${caseItem.thread_id}`)
                            ) : (
                              <span key={`author-${caseItem.thread_id}`}>{authorText.display}</span>
                            )}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination with max 10 pages display */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              {getPaginationPages().map((page, index) => {
                if (page === "...") {
                  return (
                    <Typography
                      key={`ellipsis-${index}`}
                      variant="body2"
                      sx={{ px: 1 }}
                    >
                      <span key={`ellipsis-text-${index}`}>...</span>
                    </Typography>
                  );
                }
                const pageNum = page as number;
                const isActive = currentPage === pageNum;
                return (
                  <MuiButton
                    key={pageNum}
                    variant={isActive ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={isLoading}
                    sx={{
                      minWidth: "40px",
                      backgroundColor: isActive ? "#4B73FF" : "transparent",
                      color: isActive ? "#ffffff" : "#4B73FF",
                      borderColor: "#4B73FF",
                      fontWeight: isActive ? 700 : 400,
                      "&:hover": {
                        backgroundColor: isActive ? "#3d5ce6" : "rgba(75, 115, 255, 0.08)",
                        borderColor: "#4B73FF",
                      },
                      "&.Mui-disabled": {
                        borderColor: "#e0e0e0",
                        color: "#9e9e9e",
                      },
                    }}
                  >
                    <span key={`page-num-${pageNum}`}>{pageNum}</span>
                  </MuiButton>
                );
              })}
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default InternalCasesSearchPage;
