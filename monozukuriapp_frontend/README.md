# KaizenHub - AI-Powered Quality Management Platform

> 「考える」を、「みえる化」する - AIが課題ばらしをサポート。直観的な操作で複雑な問題もすっきり整理。

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.3.1-646CFF.svg)](https://vitejs.dev/)

## About the Project

KaizenHub is a comprehensive cloud-based quality management platform designed for manufacturing professionals and problem solvers. The platform combines traditional QC (Quality Control) methodologies with modern AI assistance to help teams identify root causes, prioritize issues, and implement effective solutions.

### Target Audience
- Manufacturing QC professionals
- Quality assurance teams
- Process improvement specialists
- Organizations implementing Kaizen methodologies
- Anyone seeking AI-assisted problem-solving tools

### Key Value Proposition
- **AI-Assisted Analysis**: Leverage artificial intelligence to accelerate root cause analysis
- **Visual Thinking Tools**: Transform complex problems into clear, actionable diagrams
- **Cloud-Based Collaboration**: Access your analysis from anywhere, anytime
- **Expert Support**: Connect with quality management specialists for guidance

## Features

### 🔍 **Pareto Chart Tool**
- Data visualization for prioritizing issues using the 80/20 principle
- Interactive chart creation and editing
- Export capabilities for reports and presentations
- Cloud storage for data persistence

### 🐟 **Fishbone Diagram (Ishikawa)**
- AI-assisted root cause analysis with interactive editing
- Traditional and AI-powered diagram creation
- Real-time collaboration features
- Export to multiple formats (PDF, PNG, SVG)

### 🤔 **Why-Why Analysis**
- AI-powered root cause investigation with chat interface
- Interactive tree visualization
- Thread management and history tracking
- Automated report generation

### 🛠️ **Improvement Support Services**
- Expert consultation and guidance
- On-site investigation support
- Data analysis assistance
- Custom improvement strategies

## Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks and concurrent features
- **TypeScript 5.5.2** - Type-safe development
- **Vite 5.3.1** - Fast build tool and dev server

### UI & Styling
- **Material-UI (MUI)** - Comprehensive React component library
- **Radix UI** - Accessible, unstyled UI primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library

### State Management
- **Redux Toolkit** - Predictable state container
- **Zustand** - Lightweight state management
- **React Context** - Component-level state sharing

### Charts & Diagrams
- **D3.js** - Data visualization library
- **ReactFlow** - Interactive node-based diagrams
- **Chart.js & React-Chartjs-2** - Chart components
- **Recharts** - Composable charting library

### Authentication & Backend
- **AWS Amplify** - Full-stack development platform
- **AWS Cognito** - User authentication and management
- **Socket.io** - Real-time communication

### Additional Libraries
- **React Router** - Client-side routing
- **Formik** - Form state management
- **React Hook Form** - Performant forms
- **React DnD** - Drag and drop functionality

## Project Structure

The application follows a feature-based architecture with clear separation between the landing page and authenticated application:

```
src/
├── components/          # Shared UI components
│   ├── auth/           # Authentication components
│   ├── chart/          # Chart-specific components
│   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   └── ui/             # Reusable UI primitives
├── features/           # Feature-based modules
│   ├── auth/           # Authentication feature
│   ├── diagram/        # Fishbone diagram tools
│   ├── fta/            # Fault Tree Analysis
│   ├── kaizen-hub/     # Community features
│   ├── pareto/         # Pareto chart tools
│   ├── settings/       # User settings
│   └── whywhy/           # Why-why analysis tools
├── pages/              # Page components
│   ├── InitialPage/    # Landing page (no auth required)
│   ├── HomePage/       # Authenticated dashboard
│   └── kaizen-hub/     # Community pages
├── hooks/              # Custom React hooks
├── services/           # API services
├── store/              # State management
└── utils/              # Utility functions
```

### Architecture Highlights
- **Landing Page**: `InitialPage` component serves as the marketing/landing page (no authentication required)
- **Authenticated App**: Protected routes with `Layout` wrapper for logged-in users
- **Role-Based Access**: KaizenHub community features require specific user roles
- **Feature-Based Structure**: Each major functionality is self-contained for better maintainability

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Yarn** package manager
- **AWS Cognito** credentials for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd monozukuriapp_frontend
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your AWS Cognito credentials:
   ```env
   VITE_USER_POOL_ID=your_user_pool_id_here
   VITE_USER_POOL_CLIENT_ID=your_user_pool_client_id_here
   ```

4. **Start development server**
   ```bash
   yarn dev
   ```

   The application will be available at `http://localhost:5173`

### Development with Mock Server
For development without backend dependencies:
```bash
yarn dev:mock
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server |
| `yarn dev:mock` | Start with mock server |
| `yarn build` | Create production build |
| `yarn preview` | Preview production build |
| `yarn test` | Run Jest tests |
| `yarn test:watch` | Run tests in watch mode |
| `yarn storybook` | Launch Storybook for component development |
| `yarn format` | Format code with Prettier |
| `yarn lint` | Run ESLint for code quality |
| `yarn pretty` | Format all files with Prettier |

## Development Tools

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for quality gates
- **lint-staged** - Pre-commit linting

### Testing
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing utilities
- **Storybook** - Component development and documentation

### Development
- **Vite** - Fast build tool with HMR
- **TypeScript** - Static type checking
- **Tailwind CSS** - Utility-first styling
- **Material-UI** - Component library

## Configuration Files

- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `jest.config.cjs` - Jest testing configuration
- `babel.config.cjs` - Babel transpilation configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Ensure all linting and formatting checks pass

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or questions about KaizenHub:
- Contact: [Your contact information]
- Documentation: [Link to detailed docs if available]

---

**KaizenHub** - Transforming problem-solving with AI-powered quality management tools.