# Project Structure Documentation

## Overview
This is a React 18+ TypeScript application built with Vite, featuring a comprehensive kaizen management system with multiple analysis tools including Pareto charts, Fishbone diagrams, FTA (Fault Tree Analysis), and Why-Why analysis.

## Tech Stack
- **Frontend**: React 18+ (Functional Components, Hooks)
- **Language**: TypeScript (Strict Mode)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui + Material-UI
- **State Management**: Redux Toolkit (Global) + Zustand (Local)
- **Routing**: React Router v6
- **Testing**: Jest + React Testing Library + Storybook
- **Authentication**: AWS Amplify (Cognito)
- **Charts**: Chart.js, Recharts, D3.js
- **UI Components**: Radix UI, Material-UI, Custom Components

## Root Directory Structure

```
systemsquare_jatco_front-end/
├── public/                     # Static assets
│   ├── fonts/                 # Custom fonts (NotoSansJP, BIZUDPGothic, etc.)
│   ├── image/                 # Images and icons
│   ├── files/                 # Template files (Excel, etc.)
│   └── pdf/                   # PDF documents
├── src/                       # Source code
├── reference/                 # Documentation and guides
├── mock-server/              # Mock API server for development
├── probably_not_used/        # Legacy scripts and utilities
├── stories/                  # Storybook stories
└── Configuration files       # package.json, vite.config.ts, etc.
```

## Source Code Structure (`src/`)

### Core Application Files
```
src/
├── App.tsx                    # Main application component
├── main.tsx                   # Application entry point
├── index.css                  # Global styles
├── vite-env.d.ts             # Vite type definitions
└── setupTests.ts             # Jest test configuration
```

### Feature-Based Architecture (`src/features/`)
The application follows a feature-based folder structure where each major functionality is organized as a self-contained feature:

#### 1. Authentication (`src/features/auth/`)
```
auth/
├── login/
│   └── LoginPage.tsx         # Login page component
└── register/
    └── RegisterPage.tsx       # Registration page component
```

#### 2. Diagram Tools (`src/features/diagram/`)
```
diagram/
├── AIFishboneChart/          # AI-powered fishbone diagram
├── FishBoneChart/           # Traditional fishbone diagram
├── DiagramPage/             # Main diagram page
├── hooks/                   # Diagram-specific hooks
├── services/               # Diagram API services
├── types/                  # TypeScript interfaces
└── utils/                  # Diagram utilities and helpers
    └── fishbone/           # Fishbone-specific utilities
```

#### 3. FTA (Fault Tree Analysis) (`src/features/fta/`)
```
fta/
├── components/              # FTA-specific components
│   ├── beardcumd/          # Breadcrumb components
│   ├── chat/               # Chat UI for AI assistance
│   ├── DotAnimation/       # Loading animations
│   ├── Node/               # Tree node components
│   └── NodeForm/           # Node form components
├── FtaDiagram/             # Main FTA diagram component
├── FtaPage/               # FTA page component
├── hooks/                 # FTA-specific hooks
├── services/              # AI services for FTA
├── types/                 # FTA type definitions
└── utils/                 # FTA utilities and analysis
```

#### 4. Kaizen Hub (`src/features/kaizen-hub/`)
```
kaizen-hub/
├── components/             # Kaizen hub components
│   ├── KaizenHubInfo/      # Information display components
│   └── PostInfo/           # Post information components
├── home/                   # Home page components
├── recipe-footer/          # Recipe footer components
├── search/                 # Search functionality
└── styles.css             # Kaizen hub specific styles
```

#### 5. Pareto Analysis (`src/features/pareto/`)
```
pareto/
├── components/             # Pareto chart components
│   ├── CompareMode/        # Comparison mode components
│   ├── SingleMode/         # Single mode components
│   ├── ChartControls/      # Chart control components
│   ├── DataInput/          # Data input components
│   ├── DataTable/          # Data table components
│   └── ParetoChart/        # Main Pareto chart
├── hooks/                  # Pareto-specific hooks
│   ├── global/             # Global state hooks
│   └── local/              # Local state hooks
├── services/               # Pareto API services
├── types/                  # Pareto type definitions
└── utils/                  # Pareto calculation utilities
```

#### 6. Settings (`src/features/settings/`)
```
settings/
├── components/             # Settings components
│   ├── AutoSave/           # Auto-save settings
│   ├── ChangePassword/     # Password change functionality
│   ├── FontSelection/      # Font selection
│   ├── LangSelection/      # Language selection
│   └── MyPage/             # User profile page
└── SettingsPage.tsx        # Main settings page
```

#### 7. Why-Why Analysis (`src/features/whywhy/`)
```
whywhy/
├── components/             # Why-Why analysis components
│   ├── ChatMessage/        # Chat message components
│   ├── CustomNode/         # Custom tree nodes
│   ├── LeftMessages/       # Left-aligned messages
│   ├── RightMessages/      # Right-aligned messages
│   ├── NodeDetailDialog/   # Node detail dialogs
│   ├── ReportCreationPage.tsx # Report creation page
│   ├── ReportPreviewExact.tsx # Report preview page
│   ├── ThreadChildrenList.tsx # List child threads of a parent
│   ├── ThreadList.tsx         # Thread list entry points
│   ├── ThreadListFull.tsx     # Full thread list with navigation
│   ├── ProblemInfo.tsx        # Problem header card in analysis view
│   └── WhyWhyTreeVisualization/ # Tree visualization
├── WhyWhyAnalysisView/     # Analysis view
├── WhyWhyCreatePage/       # Creation page
├── WhyWhyPage/             # Main Why-Why page
├── WhyWhyPageView/         # View page
└── types.ts                # Why-Why type definitions (added)
```

### Shared Components (`src/components/`)

#### Authentication Components (`src/components/auth/`)
```
auth/
├── ConfirmEmailForm/       # Email confirmation
├── LoginForm/             # Login form
├── SignUpForm/              # Sign-up form
├── VerifyCodeForm/         # Code verification
└── VerifySignUp/           # Sign-up verification
```

#### Chart Components (`src/components/chart/`)
```
chart/
├── GeneralChart/           # General chart component
└── GeneralFishboneChart/   # Fishbone chart component
    ├── components/         # Chart sub-components
    ├── constants/          # Chart constants
    └── enums/              # Chart enumerations
```

#### Layout Components (`src/components/layout/`)
```
layout/
├── AuthLayout.tsx          # Authentication layout
├── Layout.tsx              # Main application layout
├── Header/                 # Header components
├── Footer/                 # Footer components
└── Sidebar/                # Sidebar components
```
##### Desktop-first behavior in `Layout.tsx`
- Right panel visible only on desktop (`lg` ≥ 1280); hidden on tablet/mobile
- Right panel width: 300px on desktop, 350px on large desktop (≥1600)
- Main content centered with `maxWidth: 1440` on desktop for readability
- No global breakpoint renames; logic is localized in `Layout.tsx`

#### UI Components (`src/components/ui/`)
```
ui/
├── Alert/                  # Alert components
├── Avatar/                 # Avatar components
├── Badge/                  # Badge components
├── Button/                 # Button components
├── Card/                   # Card components
├── Chart/                  # Chart components
├── Form/                   # Form components
├── Input/                  # Input components
├── Modal/                  # Modal components
├── Table/                  # Table components
└── ...                     # Other UI components
```

### Pages (`src/pages/`)
```
pages/
├── HomePage/               # Home page
├── ErrorPage/              # Error page
├── Feedback/               # Feedback page
├── InitialPage/            # Initial/landing page
├── kaizen-hub/             # Kaizen hub pages
│   ├── components/         # Kaizen hub components
│   ├── constants/          # Kaizen hub constants
│   └── modules/            # Kaizen hub modules
├── PrivacyandPolicy/       # Privacy policy page
└── whywhy/                 # Why-Why analysis pages
    ├── HistoryPage.tsx     # History listing page
    └── ...
```

### State Management (`src/store/`)

#### Redux Store (`src/store/`)
```
store/
├── store.ts                # Redux store configuration
├── redux.ts                # Redux setup
├── reducer/                # Redux reducers
├── slices/                 # Redux Toolkit slices
│   ├── authSlice.ts        # Authentication state
│   ├── paretoSlice.ts      # Pareto chart state
│   ├── ftaSlice.ts         # FTA state
│   ├── whywhySlice.ts      # Why-Why analysis state
│   ├── diagramSlice.ts     # Diagram state
│   └── ...                 # Other feature slices
└── singlemodeProvider/     # Single mode provider
```

### Services (`src/services/`)
```
services/
└── apis/                   # API service files
    ├── authApi.ts          # Authentication API
    ├── paretoApi.ts        # Pareto API
    ├── ftaApi.ts           # FTA API
    ├── whyWhyService.ts    # Why-Why thread + stream endpoints (createThread, getThread, streamAnalysis, etc.)
    └── ...                 # Other API services
```

### Hooks (`src/hooks/`)
```
hooks/
├── useAuth.ts              # Authentication hook
├── useAutoSaveForm.ts      # Auto-save form hook
├── useCheckAuth.ts         # Auth check hook
├── useCopyToClipboard.ts   # Clipboard hook
├── useDebounce.ts          # Debounce hook
├── useLoading.ts           # Loading state hook
└── ...                     # Other custom hooks
```

### Utilities (`src/utils/`)
```
utils/
├── clearCognitoSession.ts  # Session management
├── formatDateJP.ts         # Japanese date formatting
├── getTextStatus.ts        # Text status utilities
└── ...                     # Other utility functions
```

### Configuration (`src/config/`)
```
config/
└── amplify-config.ts       # AWS Amplify configuration
```

### Types and Interfaces (`src/interfaces/`)
```
interfaces/
├── improvement.ts          # Improvement interfaces
├── thread.ts               # Thread interfaces
└── index.ts                # Main interface exports
```

### Enums (`src/enum/`)
```
enum/
├── index.ts                # Main enum exports
├── pathnames.tsx           # Route pathnames
└── kaizenhub/              # Kaizen hub enums
```
##### Notable routes for Why-Why
- App.WHYWHY, App.WHYWHY_CREATE, App.WHYWHY_VIEW, App.WHYWHY_ANALYSIS_VIEW, App.WHYWHY_HISTORY
- App.REPORT_CREATION_PAGE, App.REPORT_PREVIEW_PAGE

### Constants (`src/constant/`)
```
constant/
├── contributors.ts         # Contributor data
├── enum.ts                 # Application enums
└── faq.ts                  # FAQ data
```

### Theme (`src/theme/`)
```
theme/
├── globalStyles.ts         # Global styles
└── theme.ts                # Theme configuration
```
#### Desktop-first settings
- Responsive typography is enabled via MUI `responsiveFontSizes` for better desktop readability
- Breakpoints remain default: `md: 960` (tablet), `lg: 1280` (desktop), `xl: 1920`
- Large desktop logic uses a raw media query `(min-width:1600px)` locally where needed (no global breakpoint churn)

## Key Features

### 1. **Pareto Analysis**
- Single mode and comparison mode
- Data input and visualization
- Export functionality
- Cloud data integration

### 2. **Fishbone Diagram**
- Traditional and AI-powered fishbone charts
- Interactive node editing
- Export capabilities
- Real-time collaboration

### 3. **FTA (Fault Tree Analysis)**
- Tree structure visualization
- AI-powered analysis
- Chat interface for assistance
- Export and sharing

### 4. **Why-Why Analysis**
- Interactive tree visualization
- Thread management
- Report generation
- History tracking

### 5. **Kaizen Hub**
- Community features
- Recipe sharing
- Search and filtering
- User profiles

## Development Tools

### Testing
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Storybook**: Component documentation and testing

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit linting

### Development
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS
- **Material-UI**: Component library

## Build and Deployment

### Scripts
- `npm run dev`: Development server
- `npm run build`: Production build
- `npm run preview`: Preview production build
- `npm run test`: Run tests
- `npm run storybook`: Start Storybook
- `npm run dev:mock`: Development with mock server

### Configuration Files
- `vite.config.ts`: Vite configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `jest.config.cjs`: Jest configuration
- `babel.config.cjs`: Babel configuration

## Architecture Patterns

### 1. **Feature-Based Structure**
Each major feature is self-contained with its own components, hooks, services, and types.

### 2. **Atomic Design**
UI components follow atomic design principles with atoms, molecules, and organisms.

### 3. **State Management**
- Redux Toolkit for global state
- Zustand for local component state
- React hooks for component state

### 4. **Type Safety**
- Strict TypeScript configuration
- Interface definitions for all data structures
- Proper typing for API responses

### 5. **Responsive Design**
- **Desktop-first approach** with clear screen classes
  - < 960 (mobile): Sidebar can collapse; right panel hidden
  - 960–1279 (tablet): Right panel hidden
  - 1280–1599 (desktop): Right panel visible at 300px
  - ≥1600 (large desktop): Right panel 350px; optionally 400px at ≥1920
- **Content width**: On desktop, main content centered with `maxWidth: 1440`
- **Typography**: Scales with MUI `responsiveFontSizes`
- **Utilities**: Tailwind remains primary; MUI breakpoints used for layout logic

This structure supports a scalable, maintainable React application with clear separation of concerns and feature-based organization.
