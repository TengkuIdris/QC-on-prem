Why-Why Analysis AI Support System
Overview
This system is an AI-assisted tool designed to conduct why-why analysis based on problems, causes, and observational information input by users, in order to identify the true root cause. Built on a Large Language Model (LLM), it automates and supports the method of repeatedly asking “why” when addressing a problem to help pinpoint the fundamental cause. The purpose of this system is to efficiently identify the underlying root causes (true causes) of issues arising in manufacturing and quality control settings.
Features
Structured Input with 5M1E Framework: Problem information can be entered using the 5M1E framework (Man, Machine, Material, Method, Measurement, Environment).
Automatic Why-Chain Generation Using LLM: The system automatically generates a chain of “why”s by utilizing an LLM.
Interactive Information Gathering via Chat: Users can provide additional information interactively through chat.
Root Cause Prioritization by Confidence Evaluation: The system shows candidate root causes in order of priority based on confidence levels.
Suggested Solutions for Each Root Cause: For every possible root cause, suggested actions can be provided.
Technical Stack
Language: Python 3.12+
Framework: Streamlit
Large Language Model: Google Cloud Vertex AI Gemini
LLM Frameworks: LangChain, LangGraph
Cloud Service: Google Cloud Platform
Application: Streamlit
Setting Up the Development Environment
Before starting development, please install the following tools on your local machine:
Python 3.12 or later: Download and install from the official website.
uv: A fast Python package installer. Refer to the official documentation for instructions.
1. Clone the Repository
 bash
git clone https://github.com/blavusai/jatco-why-why-chat-ai.git
cd jatco-why-why-chat-ai
2. Create and Activate Virtual Environment
Use uv to create and activate a Python virtual environment.
 bash
# Create the virtual environment (.venv directory will be created)
uv venv

# Activate the virtual environment (macOS / Linux)
source .venv/bin/activate

# (On Windows)
# .venv\Scripts\activate
3. Install Dependencies
Use uv sync to install dependencies recorded in the uv.lock file, ensuring consistency across all developers.
 bash
# Install dependencies from uv.lock (includes development dependencies)
uv sync --extra dev
Next, install the project in editable mode.
 bash
# The key is to use --no-deps to skip reinstalling dependencies
uv pip install -e . --no-deps
4. Set Environment Variables
The application loads environment variables such as database connection information from a .env file.
Copy .env.example:
 bash
cp .env.example .env
Edit .env: For local development, mainly set the database connection URL (DATABASE_URL).
If using Docker Compose: Since DATABASE_URL is set in docker-compose.yml, you do not need to set it in .env.
If running the server directly locally: If the infrastructure has been built using Terraform, you can obtain the development database connection URL with the following commands:
 bash
# (in another terminal)
  cd terraform
  terraform workspace select dev
  terraform output database_url
Set the obtained URL in the .env file at the project root as DATABASE_URL="obtained URL".
Set other environment variables (e.g. API keys) in .env as needed.
5. Database Migration
Apply the table schema (migration) to the database.
 bash
# Make sure DATABASE_URL is set in .env
alembic upgrade head
This completes the local development environment setup.
Running Locally
Start the API Server
Start the API server built with FastAPI:
 bash
uvicorn why_why_chat_ai.api.app:app --reload
The --reload option enables automatic server restarts when the code changes. The API will be available at <a href="http://127.0.0.1:8000">http://127.0.0.1:8000</a>.
Start the Streamlit UI
 bash
streamlit run why_why_chat_ai/poc/app.py
A new browser tab will open and display the application's UI.
Docker
 bash
# Start API server
docker compose up -d api

# Show API server logs
docker compose logs -f api

# Start Streamlit UI
docker compose up -d streamlit

# Show Streamlit server logs
docker compose logs -f streamlit
Information for Developers
Project Structure
why-why-chat-ai/
├── alembic/                   # DB migration management
│   ├── env.py
│   ├── README
│   ├── script.py.mako
│   └── versions/
├── docs/                      # Documentation
│   ├── api_usage_guide.md
│   ├── detail_design.md       # Detailed design documents
│   ├── references/
│   ├── spec.md                # Specifications document
├── why_why_chat_ai/           # Source code
│   ├── __init__.py
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── action.py
│   │   ├── agent_builder.py
│   │   ├── config.py
│   │   ├── dummy_agent.py
│   │   ├── models.py
│   │   ├── sample_agent.py
│   │   ├── utils.py
│   │   ├── why_why_action.py
│   │   └── why_why_agent.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── __main__.py
│   │   ├── app.py
│   │   ├── auth.py
│   │   ├── callbacks.py
│   │   ├── config.py
│   │   ├── lifespan.py
│   │   ├── middleware.py
│   │   ├── models.py
│   │   ├── rate_limiting.py
│   │   ├── routers/
│   │   ├── security.py
│   │   ├── services/
│   │   └── telemetry.py
│   ├── poc/
│   │   ├── __main__.py
│   │   ├── app.py
│   │   └── utils.py
├── tests/                     # Test code
│   ├── agent/
│   ├── api/
│   │   ├── routers/
│   │   └── services/
│   ├── integration/
│   └── poc/
├── scripts/                   # Utility scripts
├── terraform/                 # IaC (Terraform)
│   ├── modules/
│   ├── outputs.tf
│   ├── variables.tf
│   └── ...
├── pyproject.toml             # Package settings
├── uv.lock                    # Dependency lock file
├── .env.example               # Sample environment variable file
├── makefile                   # Build script
├── docker-compose.yml         # Docker configuration
├── Dockerfile                 # For Docker build
└── README.md                  # This file
Running Tests
 bash
pytest
Debug Mode
To display debug information, set DEBUG_MODE=True in the .env file.
Deployment & Infrastructure
For infrastructure setup and management, CI/CD pipelines, and deployment procedures, refer to the following documentation:
:book: Terraform Operation Procedures and Infrastructure Settings
Resource management using Terraform
CI/CD service account permission settings
Development and production environment deployment procedures
API Gateway configuration and API Key management
Troubleshooting
API Gateway Access Information (Development Environment)URL: https://why-why-chat-ai-gateway-dev-2uh72sv9.an.gateway.dev
Authentication: API Key (specified in the x-api-key header)
For details, see the API Gateway evaluation documentation.