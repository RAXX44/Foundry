# Foundry Setup Guide
### Complete Installation and Configuration Instructions

---

## Prerequisites

Before setting up Foundry, ensure you have the following installed:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** 9.0 or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **IBM Cloud Account** ([Sign up](https://cloud.ibm.com/registration))
- **watsonx.ai Access** ([Get started](https://www.ibm.com/watsonx))

---

## Quick Start (5 Minutes)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/foundry.git
cd foundry

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your IBM watsonx.ai credentials

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

---

## Detailed Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/foundry.git
cd foundry
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages:
- Next.js 14
- React 18
- TypeScript 5
- Prisma 5
- Tailwind CSS
- Monaco Editor
- React Dropzone
- Zod
- Faker.js
- And more...

**Expected output:**
```
added 342 packages, and audited 343 packages in 45s
```

### Step 3: Configure Environment Variables

#### 3.1 Create `.env` file

```bash
cp .env.example .env
```

#### 3.2 Get IBM watsonx.ai Credentials

**A. Get API Key:**

1. Log in to [IBM Cloud Console](https://cloud.ibm.com/)
2. Click your profile icon → **Manage → Access (IAM)**
3. Select **API keys** from left sidebar
4. Click **Create an IBM Cloud API key**
5. Enter a name (e.g., "Foundry Development")
6. Click **Create**
7. **Copy the API key** (shown only once!)

**B. Get Project ID:**

1. Navigate to [watsonx.ai](https://dataplatform.cloud.ibm.com/wx/home)
2. Click **Projects** in left sidebar
3. Create a new project or select existing one
4. Click **Manage** tab
5. Copy the **Project ID** from the URL or settings

**C. Get watsonx URL (Optional):**

Default is `https://us-south.ml.cloud.ibm.com`. If your project is in a different region:
- **US South**: `https://us-south.ml.cloud.ibm.com`
- **EU Germany**: `https://eu-de.ml.cloud.ibm.com`
- **Japan Tokyo**: `https://jp-tok.ml.cloud.ibm.com`

#### 3.3 Update `.env` file

```bash
# IBM watsonx.ai Configuration
WATSONX_API_KEY="your-ibm-cloud-api-key-here"
WATSONX_PROJECT_ID="your-watsonx-project-id-here"
WATSONX_URL="https://us-south.ml.cloud.ibm.com"

# Application Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**⚠️ Important**: Never commit `.env` to version control!

### Step 4: Verify Configuration

Run the configuration check:

```bash
npm run check-config
```

**Expected output:**
```
✓ WATSONX_API_KEY is set
✓ WATSONX_PROJECT_ID is set
✓ WATSONX_URL is set
✓ All environment variables configured correctly
```

If you see errors, double-check your `.env` file.

### Step 5: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.100:3000

 ✓ Ready in 2.3s
```

### Step 6: Test the Application

1. Open browser to `http://localhost:3000`
2. You should see the Foundry landing page
3. Try uploading a sample ERD image
4. Verify code generation works

---

## Project Structure

```
foundry/
├── app/                          # Next.js 14 App Router
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # Main API endpoint
│   ├── results/
│   │   └── page.tsx              # Results display page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── lib/                          # Core business logic
│   ├── ai/
│   │   └── extractor.ts          # AI extraction layer
│   ├── generators/
│   │   ├── api-generator.ts      # API routes generator
│   │   ├── mermaid-generator.ts  # Mermaid diagram generator
│   │   ├── prisma-generator.ts   # Prisma schema generator
│   │   ├── seed-generator.ts     # Seed script generator
│   │   └── zod-generator.ts      # Zod schemas generator
│   ├── parser/
│   │   └── ast-builder.ts        # AST builder
│   ├── pipeline/
│   │   └── orchestrator.ts       # Pipeline coordinator
│   ├── utils/
│   │   └── string.ts             # String utilities
│   ├── validators/
│   │   └── erd-validator.ts      # AST validator
│   └── watsonx.ts                # Legacy watsonx integration
├── types/
│   └── erd.ts                    # TypeScript type definitions
├── public/
│   └── asset/
│       └── logo.png              # Foundry logo
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # Main documentation
├── ARCHITECTURE.md               # Architecture overview
├── PIPELINE_ARCHITECTURE.md      # Pipeline deep dive
├── WATSONX_INTEGRATION.md        # watsonx.ai integration
└── SETUP.md                      # This file
```

---

## Development Workflow

### Running the Application

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Environment Modes

**Development** (`NODE_ENV=development`):
- Hot module replacement
- Detailed error messages
- Source maps enabled
- Prisma query logging

**Production** (`NODE_ENV=production`):
- Optimized builds
- Minimal error messages
- No source maps
- Performance optimizations

### Testing Locally

1. **Upload Test ERD**: Use sample ERD images from `test/fixtures/`
2. **Check Console**: Monitor browser console for errors
3. **Verify Output**: Download ZIP and inspect generated files
4. **Test API**: Use Postman collection (generated in ZIP)

---

## Database Setup (Optional)

Foundry generates Prisma schemas but doesn't require a database to run. However, if you want to test the generated code:

### PostgreSQL Setup

```bash
# 1. Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: Download from postgresql.org

# 2. Create database
createdb foundry_test

# 3. Update .env in generated project
DATABASE_URL="postgresql://user:password@localhost:5432/foundry_test"

# 4. Run migrations
cd generated-project
npx prisma migrate dev --name init

# 5. Seed database
npx ts-node prisma/seed.ts
```

### MySQL Setup

```bash
# 1. Install MySQL
# macOS: brew install mysql
# Ubuntu: sudo apt-get install mysql-server
# Windows: Download from mysql.com

# 2. Create database
mysql -u root -p
CREATE DATABASE foundry_test;

# 3. Update .env
DATABASE_URL="mysql://user:password@localhost:3306/foundry_test"

# 4. Run migrations
npx prisma migrate dev --name init
```

### SQLite Setup (Easiest)

```bash
# No installation needed! SQLite is file-based

# 1. Update .env
DATABASE_URL="file:./dev.db"

# 2. Run migrations
npx prisma migrate dev --name init

# 3. Database file created at ./prisma/dev.db
```

---

## Docker Setup (Optional)

Run Foundry in a Docker container:

### Build Image

```bash
docker build -t foundry:latest .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e WATSONX_API_KEY="your-key" \
  -e WATSONX_PROJECT_ID="your-project-id" \
  foundry:latest
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  foundry:
    build: .
    ports:
      - "3000:3000"
    environment:
      - WATSONX_API_KEY=${WATSONX_API_KEY}
      - WATSONX_PROJECT_ID=${WATSONX_PROJECT_ID}
      - NODE_ENV=production
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

---

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com/)
   - Click **Import Project**
   - Select your GitHub repository
   - Add environment variables:
     - `WATSONX_API_KEY`
     - `WATSONX_PROJECT_ID`
     - `WATSONX_URL`
   - Click **Deploy**

3. **Custom Domain** (Optional):
   - Go to project settings
   - Add custom domain
   - Update DNS records

### Other Platforms

**Netlify**:
```bash
npm run build
netlify deploy --prod
```

**AWS Amplify**:
```bash
amplify init
amplify add hosting
amplify publish
```

**Railway**:
```bash
railway init
railway up
```

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "WATSONX_API_KEY is not defined"

**Solution**:
1. Check `.env` file exists
2. Verify no extra spaces in `.env`
3. Restart development server

### Issue: "Failed to authenticate with IBM Cloud"

**Solution**:
1. Verify API key is correct
2. Check API key hasn't expired
3. Ensure watsonx.ai access is enabled
4. Try creating a new API key

### Issue: "Port 3000 already in use"

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Issue: "AI returned empty response"

**Solution**:
1. Check image quality (resolution, clarity)
2. Verify image is a valid ERD diagram
3. Try a different image format (PNG vs JPEG)
4. Simplify the ERD (fewer tables)

### Issue: "Rate limit exceeded"

**Solution**:
1. Wait 60 seconds and retry
2. Check IBM Cloud usage dashboard
3. Upgrade watsonx.ai plan if needed
4. Implement caching (see WATSONX_INTEGRATION.md)

---

## Performance Optimization

### Image Optimization

Install Sharp for faster image processing:

```bash
npm install sharp
```

### Caching (Redis)

For production, add Redis caching:

```bash
npm install ioredis
```

Update `.env`:
```bash
REDIS_URL="redis://localhost:6379"
```

### CDN Integration

Serve static assets from CDN:

```bash
# next.config.js
module.exports = {
  assetPrefix: 'https://cdn.yourdomain.com',
}
```

---

## Security Best Practices

1. **Never commit `.env`**: Already in `.gitignore`
2. **Rotate API keys**: Every 90 days
3. **Use environment variables**: Never hardcode secrets
4. **Enable HTTPS**: In production
5. **Implement rate limiting**: Prevent abuse
6. **Monitor usage**: Set billing alerts
7. **Use service IDs**: For production deployments

---

## Getting Help

### Documentation
- [README.md](./README.md) - Overview and quick start
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [PIPELINE_ARCHITECTURE.md](./PIPELINE_ARCHITECTURE.md) - Pipeline details
- [WATSONX_INTEGRATION.md](./WATSONX_INTEGRATION.md) - AI integration

### Support Channels
- **GitHub Issues**: [github.com/yourusername/foundry/issues](https://github.com/yourusername/foundry/issues)
- **Email**: support@foundry.dev
- **Discord**: [discord.gg/foundry](https://discord.gg/foundry)

### Useful Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [IBM watsonx.ai Documentation](https://www.ibm.com/docs/en/watsonx-as-a-service)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Next Steps

After setup, you can:

1. **Upload an ERD**: Test the core functionality
2. **Explore Generated Code**: Download ZIP and inspect files
3. **Customize Generators**: Modify `lib/generators/*.ts`
4. **Add New Features**: Extend the pipeline
5. **Deploy to Production**: Follow deployment guide above

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Setup complete! 🎉**

Ready to transform ERD diagrams into production backends.

[Back to README](./README.md) • [View Architecture](./ARCHITECTURE.md) • [Report Issue](https://github.com/yourusername/foundry/issues)

</div>