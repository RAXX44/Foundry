# Foundry 🏗️
> Transform ERD diagrams into production-ready backend code with AI — in 60 seconds.

Built for the IBM Bob Hackathon 2026. Powered by IBM watsonx.ai vision model and built with IBM Bob IDE.

## ✨ Features

### 🚀 Live Features
- 📸 **AI Vision ERD Analysis** — Upload any ERD image, IBM watsonx.ai Llama 3.2 Vision reads every entity and relationship
- 🗄️ **Database Type Selector** — Choose PostgreSQL, MySQL, or SQLite before generating
- 📝 **Prisma Schema Generator** — Production-ready schema with @relation, camelCase, auto-timestamps
- 🔌 **Next.js API Routes** — Full CRUD (GET, POST, PUT, DELETE) for every detected model
- 🔮 **Live ERD Diagram** — Reverse-engineered Mermaid diagram from generated code
- ✏️ **Monaco Editor** — Edit schema and routes directly in the browser
- 📖 **Setup Guide** — Step-by-step commands to use your generated code
- 📦 **9-File ZIP Bundle** — Download everything you need:
  - schema.prisma
  - routes.ts
  - README.md (dynamic)
  - .gitignore
  - .env.example
  - types.ts
  - Dockerfile
  - docker-compose.yml
  - app/api/health/route.ts

### 🔮 Coming Soon
- 🚀 Deploy to Neon — One-click PostgreSQL cloud database
- 🐙 Push to GitHub — Auto-commit to repository
- 🐳 Docker Deploy — One-click container deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- IBM Cloud account with watsonx.ai access

### Installation

\`\`\`bash
# Clone the repository
git clone <your-repo-url>
cd foundry

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your watsonx.ai credentials

# Start development server
npm run dev
\`\`\`

Visit \`http://localhost:3000\` to start using Foundry!

## 🔧 Environment Variables

\`\`\`bash
WATSONX_API_KEY=your_api_key
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id
\`\`\`

## 🎯 How It Works

1. **Select Database** — Choose PostgreSQL, MySQL, or SQLite
2. **Upload ERD** — Drag & drop your ERD diagram image
3. **AI Analyzes** — watsonx.ai vision model detects all entities and relationships
4. **Review & Edit** — Monaco editor lets you tweak the generated code
5. **Download ZIP** — Get 9 production-ready files instantly

## 🏗️ Project Structure

\`\`\`
foundry/
├── app/
│   ├── api/generate/    # watsonx.ai integration endpoint
│   ├── results/         # Results page with Monaco editors
│   └── page.tsx         # Home page with upload zone
├── lib/
│   └── watsonx.ts       # IBM watsonx.ai vision integration
└── .env.local           # Your credentials (never committed)
\`\`\`

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Editor**: Monaco Editor (@monaco-editor/react)
- **AI**: IBM watsonx.ai — Llama 3.2 90B Vision Instruct
- **Diagram**: Mermaid.js via mermaid.ink
- **ZIP**: JSZip
- **Upload**: react-dropzone
- **Built with**: IBM Bob IDE

## 🔐 Security

- ✅ File type and size validation (max 10MB)
- ✅ API key stored server-side only (never exposed to client)
- ✅ .env.local excluded from git

## 🗺️ Roadmap

- **V1 (Current)**: AI Vision ERD to 9-file production bundle
- **V2**: Migration scripts, seed data, AI schema validator
- **V3**: Canvas ERD editor, text-to-diagram, team collaboration
- **V4**: Multi-framework support (Django, Mongoose, Sequelize)

## 🏆 Built For

IBM Bob Hackathon 2026 — Theme: "Turn idea into impact faster"

Foundry demonstrates how IBM Bob + watsonx.ai can eliminate hours of repetitive backend setup work, letting developers focus on what matters: building features.

---

**Built with ❤️ using IBM Bob IDE, Next.js 14, and IBM watsonx.ai**
