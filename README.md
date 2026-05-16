# Foundry 🏗️

> Transform ERD diagrams into production-ready code with AI

Foundry is a Next.js 14 application that uses IBM watsonx.ai's vision capabilities to analyze Entity Relationship Diagrams (ERDs) and automatically generate Prisma schemas and Next.js API routes with full CRUD operations.

## ✨ Features

- 📸 **Upload ERD Images** - Drag & drop or select PNG/JPG diagrams
- 🤖 **AI-Powered Analysis** - watsonx.ai vision model extracts entities and relationships
- ✏️ **Interactive Editor** - Review and modify detected schema before generation
- 🎯 **Smart Generation** - Creates `schema.prisma` and complete API routes
- 💾 **Multiple Databases** - SQLite for development, PostgreSQL for production
- 📦 **Easy Export** - Download individual files or complete ZIP archive
- 🔄 **Full CRUD** - Generated routes include Create, Read, Update, Delete operations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- IBM Cloud account with watsonx.ai access

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd foundry

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your watsonx.ai credentials

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Visit `http://localhost:3000` to start using Foundry!

## 📚 Documentation

This project includes comprehensive documentation:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture, file structure, and technical design
- **[WATSONX_INTEGRATION_GUIDE.md](WATSONX_INTEGRATION_GUIDE.md)** - Detailed watsonx.ai integration instructions
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation guide
- **[VISUAL_SUMMARY.md](VISUAL_SUMMARY.md)** - Visual diagrams and flowcharts

## 🎯 How It Works

```mermaid
graph LR
    A[Upload ERD] --> B[AI Analysis]
    B --> C[Schema Preview]
    C --> D[Edit Schema]
    D --> E[Generate Files]
    E --> F[Download]
```

1. **Upload** - Drop your ERD diagram image
2. **Analyze** - watsonx.ai vision model extracts structure
3. **Review** - Interactive editor shows detected entities and relationships
4. **Edit** - Modify fields, types, and relationships as needed
5. **Generate** - Create Prisma schema and API routes
6. **Download** - Get your files as individual downloads or ZIP

## 🏗️ Project Structure

```
foundry/
├── app/                      # Next.js 14 App Router
│   ├── api/                 # API routes
│   │   ├── analyze-erd/    # ERD analysis endpoint
│   │   ├── generate-schema/ # Schema generation
│   │   └── generate-routes/ # Route generation
│   ├── preview/            # Schema preview page
│   └── page.tsx            # Home page
├── components/              # React components
│   ├── upload/             # Upload components
│   ├── schema/             # Schema editor
│   └── generation/         # Code preview & download
├── lib/                     # Core logic
│   ├── watsonx/            # watsonx.ai integration
│   ├── parsers/            # ERD parsing
│   ├── generators/         # Code generation
│   └── utils/              # Utilities
├── types/                   # TypeScript types
└── prisma/                  # Prisma schema
```

## 🔧 Configuration

### Environment Variables

```bash
# watsonx.ai Configuration
WATSONX_API_KEY=your_api_key
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id

# Database
DATABASE_URL="file:./dev.db"  # SQLite for dev
# DATABASE_URL="postgresql://..." # PostgreSQL for prod

# App Settings
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/png,image/jpeg,image/jpg
```

### Database Setup

**Development (SQLite):**
```bash
DATABASE_URL="file:./dev.db"
npx prisma db push
```

**Production (PostgreSQL):**
```bash
DATABASE_URL="postgresql://user:password@host:5432/foundry"
npx prisma migrate deploy
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Prisma (SQLite/PostgreSQL)
- **AI**: IBM watsonx.ai Vision Model
- **File Handling**: react-dropzone, JSZip

## 📖 Usage Example

### 1. Upload ERD

```typescript
// Supported formats: PNG, JPG, JPEG
// Max size: 10MB
```

### 2. Generated Prisma Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
```

### 3. Generated API Routes

```typescript
// GET /api/users - List all users
// GET /api/users/[id] - Get user by ID
// POST /api/users - Create user
// PUT /api/users/[id] - Update user
// DELETE /api/users/[id] - Delete user
```

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (when implemented)
npm test
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "start"]
```

## 🔐 Security

- ✅ File type and size validation
- ✅ API key stored in environment variables
- ✅ Input sanitization
- ✅ Rate limiting on API routes
- ✅ CORS configuration

## 🎯 Roadmap

- [ ] **Phase 1**: MVP with core features
- [ ] **Phase 2**: Multiple database support (MySQL, MongoDB)
- [ ] **Phase 3**: User authentication and project saving
- [ ] **Phase 4**: Collaboration features
- [ ] **Phase 5**: Hand-drawn ERD support
- [ ] **Phase 6**: GraphQL schema generation
- [ ] **Phase 7**: Full app scaffolding

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- IBM watsonx.ai for vision capabilities
- Vercel for Next.js framework
- Prisma for database toolkit
- shadcn for UI components

## 📞 Support

- 📧 Email: support@foundry.dev
- 💬 Discord: [Join our community](#)
- 🐛 Issues: [GitHub Issues](#)
- 📖 Docs: [Documentation](./ARCHITECTURE.md)

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Built with ❤️ using Next.js 14 and watsonx.ai**