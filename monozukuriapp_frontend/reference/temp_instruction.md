# Why-Why Application Correct Structure Documentation

## 1. Correct Page Structure of the Project

### 1.1 Active Page Components

```
whywhy/
├── components/                      # Common components
│   ├── ChatMessage/                 # Chat message components
│   ├── CustomNode/                  # Custom tree nodes
│   ├── LeftMessages/                # Left-aligned messages (AI messages)
│   ├── RightMessages/               # Right-aligned messages (User messages)
│   ├── NodeDetailDialog/            # Node detail dialog
│   ├── ReportCreationPage/          # Report creation functionality
│   ├── ThreadList/                  # Thread list
│   ├── ThreadListFull/              # Thread list (full display)
│   ├── ThreadChildrenList/          # Child thread list
│   └── WhyWhyTreeVisualization/     # Tree visualization component
│
├── WhyWhyPageView/                  # ★Main landing page (effectively the Index)
├── WhyWhyCreatePage/                # ★Initial information input page
├── WhyWhyAnalysisView/              # ★Analysis and interaction page
├── WhyWhyPage/                      # [Deprecated] Thin wrapper, only calls PageView
└── types.ts                         # Type definitions
```

### 1.2 Deprecated/To Be Organized

- **`WhyWhyPage/`**: Currently only a thin wrapper for breadcrumb settings. `WhyWhyPageView` has become the effective main page.

---

## 2. Routing Structure

| Path | Purpose | Component |
|------|---------|-----------|
| `/whywhy/view` | Landing page (overview/new/history tabs) | `WhyWhyPageView` |
| `/whywhy/create` | Initial information input form | `WhyWhyCreatePage` |
| `/whywhy/view/:sessionId` | Session-specific analysis and interaction UI | `WhyWhyAnalysisView` |
| `/whywhy/history` | History page | `HistoryPage` |
| `/whywhy/children/:parentId` | Child thread list | `ThreadChildrenList` |

---

## 3. Application UI/UX Flow

### 3.1 Overall Flow

```
1. User accesses landing page
   ↓
2. Select "Create New" → Navigate to WhyWhyCreatePage
   ↓
3. Enter initial information in the form and submit
   ↓
4. POST /threads to API → Obtain thread_id
   ↓
5. Automatically navigate to /whywhy/view/:sessionId
   ↓
6. Analysis session starts in WhyWhyAnalysisView
```

### 3.2 Detailed Description of Each Page

#### 📄 **WhyWhyPageView** (Main Landing)
- **Role**: Entry point of the application
- **Features**:
  - Tab switching (overview/new/history)
  - Selection and resumption of existing sessions
  - Starting new analysis
- **Navigation to**: 
  - When session selected → `/whywhy/view/:sessionId`
  - When creating new → `/whywhy/create`

#### 📝 **WhyWhyCreatePage** (Initial Information Input)
- **Role**: Structured input of problem information
- **Characteristics**: 
  - Form-based format instead of free text to regulate user input
  - Collects information equivalent to the initial prompt of an LLM ChatBot
- **Input Field Examples**:
  - Problem title
  - Product name, occurrence date
  - Process, location
  - Severity
  - Detailed description
  - Man/Machine/Material/Method/Measurement/Environment details
  - etc.
- **Post-Submission Behavior**:
  - Create session with `POST /threads`
  - Navigate to `/whywhy/view/:sessionId` with obtained `thread_id`

#### 🔄 **WhyWhyAnalysisView** (Interactive Analysis UI)
- **Role**: Main interaction screen after session establishment
- **Structure**: Three main sections

##### Section 1: **Chat** (Dialogue Section)
- **Purpose**: Interactive communication with API
- **Behavior**:
  - API delivers via SSE with `POST /threads/:thread_id/stream`
  - Text input becomes available only when `event: info_request` is received
  - User submits answer → API continues analysis
  - Analysis completes with `event: final_result`
- **Characteristics**: 
  - Dialogue with LLM repeats as long as there are info_requests
  - Mechanism where users respond only when needed

##### Section 2: **Tree** (Analysis Result Visualization)
- **Purpose**: Visualize Why-Why analysis results in tree structure
- **Display Content**:
  - Node structure of `state.why_nodes`
  - Hierarchical causal relationships
  - Highlighting of root causes
  - Display of recurrence prevention measures
- **Update Timing**: Incrementally updated by SSE events from API

##### Section 3: **Others** (Initial Information Display)
- **Purpose**: Confirm initial information entered in CreatePage
- **Display Content**: All fields of `state.problem` object
- **Characteristics**: No communication with API, display for reference only

---

## 4. Data Flow

### 4.1 Session Creation Flow
```
WhyWhyCreatePage
  ↓ Input completed
POST /threads (problem information)
  ↓ Response
{ thread_id, created_at }
  ↓ Navigation
navigate(`/whywhy/view/${thread_id}`)
```

### 4.2 Analysis Execution Flow
```
WhyWhyAnalysisView
  ↓ On mount
GET /threads/:thread_id (fetch initial state)
  ↓
POST /threads/:thread_id/stream (start SSE)
  ↓
event: info_request → Wait for user input
  ↓ User responds
POST /threads/:thread_id/stream { user_message }
  ↓
event: final_result → Analysis completed
```

---