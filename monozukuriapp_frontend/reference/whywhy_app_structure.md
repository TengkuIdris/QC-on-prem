## Why-Why App Structure: /whywhy/view (and /whywhy/view/:sessionId)

This documents how the Why-Why “view” pages are routed, rendered, and where data flows from after navigation to `https://kznhub.com/whywhy/view/`.

### Quick map

| Path | Purpose | Component |
|---|---|---|
| `/whywhy/view` | Landing UI (overview/new/history) | `src/features/whywhy/WhyWhyPageView` |
| `/whywhy/view/:sessionId` | Analysis view for a specific thread | `src/features/whywhy/WhyWhyAnalysisView` |

### Route constants

```startLine:endLine:src/enum/pathnames.tsx
  WHYWHY = "/whywhy",
  WHYWHY_CREATE = "/whywhy/create",
  WHYWHY_VIEW = "/whywhy/view",
  WHYWHY_ANALYSIS_VIEW = "/whywhy/view/:sessionId",
  WHYWHY_HISTORY = "/whywhy/history",
  REPORT_CREATION_PAGE = "/report-creation-page/:threadId",
  REPORT_PREVIEW_PAGE = "/report-preview/:threadId",
```

### Router definitions

```startLine:endLine:src/routes/Routers.tsx
{ path: App.WHYWHY, element: <WhyWhyPage /> },
{ path: App.WHYWHY_CREATE, element: <WhyWhyCreatePage /> },
{ path: App.WHYWHY_VIEW, element: <WhyWhyPageView /> },
{ path: App.WHYWHY_ANALYSIS_VIEW, element: <WhyWhyAnalysisView /> },
{ path: App.WHYWHY_HISTORY, element: <HistoryPage /> },
{ path: "/whywhy/children/:parentId", element: <ThreadChildrenList /> },
{ path: App.REPORT_CREATION_PAGE, element: <ReportCreationPage /> },
{ path: App.REPORT_PREVIEW_PAGE, element: <ReportPreviewExact /> },
```

### Components and responsibilities

- `src/features/whywhy/WhyWhyPageView`
  - The landing shell for Why-Why: tabs for overview, create new analysis, and history
  - Redirects to analysis view after creating or selecting an item
- `src/features/whywhy/WhyWhyAnalysisView`
  - Renders the chat + tree UI for a given `sessionId`
  - Loads thread state, manages SSE streaming, and renders `WhyWhyTreeVisualization`
- `src/features/whywhy/components/ReportCreationPage`
  - Creates printable/shareable report from a thread; navigated via the "レポート" button in analysis view
- `src/features/whywhy/components/ReportPreviewExact`
  - Preview route for reports
- `src/features/whywhy/components/ThreadChildrenList`
  - Lists child threads of a parent and links back to analysis views
- `src/features/whywhy/WhyWhyPage`
  - Thin wrapper to set breadcrumbs and render `WhyWhyPageView`

### Primary navigation entry points to analysis view

These push to `/whywhy/view/:sessionId` after user selection:

- `src/features/whywhy/components/ThreadList.tsx`
```startLine:endLine:src/features/whywhy/components/ThreadList.tsx
if (thread.children_count && thread.children_count > 0) {
  navigate(`/whywhy/children/${thread.thread_id}`)
} else {
  navigate(`/whywhy/view/${thread.thread_id}`)
}
```

- `src/features/whywhy/components/ThreadListFull.tsx`
```startLine:endLine:src/features/whywhy/components/ThreadListFull.tsx
if (thread.children_count && thread.children_count > 0) {
  navigate(`/whywhy/children/${thread.thread_id}`)
} else {
  navigate(`/whywhy/view/${thread.thread_id}`)
}
```

- `src/features/whywhy/components/ThreadChildrenList.tsx`
```startLine:endLine:src/features/whywhy/components/ThreadChildrenList.tsx
const handleThreadClick = (threadId: string) => {
  navigate(`/whywhy/view/${threadId}`)
}
```

- `src/features/whywhy/WhyWhyPageView/index.tsx` (on creation success)
```startLine:endLine:src/features/whywhy/WhyWhyPageView/index.tsx
navigate(`/whywhy/view/${thread_id}`, { state: { createdFromChild: parentId ? true : false } })
```

- `src/features/whywhy/WhyWhyCreatePage/index.tsx` (on creation success)
```startLine:endLine:src/features/whywhy/WhyWhyCreatePage/index.tsx
navigate(`/whywhy/view/${thread_id}`, { state: { createdFromChild: !!parent_id } })
```

### Analysis view: report navigation

From analysis view header, the "レポート" button links to the report creation page for the current thread.

```startLine:endLine:src/features/whywhy/WhyWhyAnalysisView/index.tsx
navigate(`/report-creation-page/${state.session.id}`, {
  state: {
    threadPrefetch: {
      thread_id: state.session.id,
      status: state.session.status,
      created_at: state.session.createdAt,
      updated_at: state.session.updatedAt,
      state: state.session.analysisData,
    },
  },
})
```

### Analysis view: parameters and data load

`WhyWhyAnalysisView` reads `:sessionId` from URL params and fetches the thread state.

```startLine:endLine:src/features/whywhy/WhyWhyAnalysisView/index.tsx
const { sessionId: rawSessionId } = useParams<{ sessionId: string }>()
const sessionId = useMemo(() => rawSessionId, [rawSessionId])
```

Fetches the thread details:

```startLine:endLine:src/features/whywhy/WhyWhyAnalysisView/index.tsx
const response = await whyWhyApiClient.getThread(sessionId!)
```

### API client

`src/services/apis/whyWhyService.ts` provides thread and stream endpoints used by the analysis view.

```startLine:endLine:src/services/apis/whyWhyService.ts
getThread = async (threadId: string) => {
  return this.get(`/threads/${threadId}`)
}

streamAnalysis = async (threadId: string, userMessage?: string, isRetry?: boolean) => {
  const payload: any = {}
  if (userMessage) payload.user_message = userMessage
  if (isRetry) payload.is_retry = isRetry
  return this.post(`/threads/${threadId}/stream`, payload)
}
```

### SSE and UI rendering

- The analysis view subscribes to SSE via `useSSE` and renders:
  - Left panel: chat history and input
  - Right panel: `WhyWhyTreeVisualization` and `ProblemInfo`

Key render container:

```startLine:endLine:src/features/whywhy/WhyWhyAnalysisView/index.tsx
<WhyWhyTreeVisualization
  nodes={analysisNodes as any}
  className="h-[calc(100vh-220px)]"
  onAskNodeQuestion={session?.status === "completed" ? undefined : handleAskNodeQuestion}
  isCompleted={session?.status === "completed"}
/> 
```

### Breadcrumbs and auxiliary routes

- Breadcrumbs set in both page shells using `BreadcrumbContext`
- Children route: `/whywhy/children/:parentId` renders `ThreadChildrenList`

### Dev tips

- Deep-linking: open a specific session with `/whywhy/view/<sessionId>`
- Creating from existing session: `再生成` button navigates to `/whywhy/create?parentId=<sessionId>` with prefill state
- If you see no tree, ensure backend returns `state.why_nodes`; chat-only sessions won’t render nodes until analysis progresses


