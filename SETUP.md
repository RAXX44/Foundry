# Foundry - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- @monaco-editor/react
- react-dropzone
- lucide-react

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your watsonx.ai credentials:

```bash
WATSONX_API_KEY=your_api_key_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Getting watsonx.ai Credentials

1. **Create IBM Cloud Account**
   - Go to [https://cloud.ibm.com](https://cloud.ibm.com)
   - Sign up for a free account

2. **Create watsonx.ai Service**
   - Navigate to the IBM Cloud Catalog
   - Search for "watsonx.ai"
   - Create a new service instance

3. **Get API Credentials**
   - Go to your watsonx.ai service dashboard
   - Navigate to "Service credentials"
   - Create new credentials or use existing ones
   - Copy the API key

4. **Get Project ID**
   - Open watsonx.ai platform
   - Create or select a project
   - Copy the Project ID from project settings

## Project Structure

```
foundry/
├── app/
│   ├── page.tsx              # Home page with upload
│   ├── results/
│   │   └── page.tsx          # Results page with Monaco editors
│   ├── api/
│   │   └── generate/
│   │       └── route.ts      # API endpoint for generation
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── lib/
│   └── watsonx.ts            # watsonx.ai helper (to be implemented)
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind config
└── next.config.js            # Next.js config
```

## Features Implemented

✅ **Home Page (app/page.tsx)**
- Dark theme UI
- Drag & drop upload zone using react-dropzone
- Image preview
- Loading states
- Error handling
- Responsive design

✅ **Results Page (app/results/page.tsx)**
- Split-screen Monaco editors
- Prisma schema editor (left)
- API routes editor (right)
- Tab switching between files
- Copy to clipboard functionality
- Download individual files
- Editable code
- Dark theme

✅ **API Route (app/api/generate/route.ts)**
- POST endpoint for file upload
- File validation (type, size)
- Mock data generation (ready for watsonx.ai integration)
- Error handling

✅ **Helper File (lib/watsonx.ts)**
- Empty helper file with documentation
- Type definitions for ERD analysis
- Ready for watsonx.ai implementation

## Next Steps

### To Complete watsonx.ai Integration:

1. **Install watsonx.ai SDK**
   ```bash
   npm install @ibm-cloud/watsonx-ai ibm-cloud-sdk-core
   ```

2. **Implement Vision API Call**
   - See `WATSONX_INTEGRATION_GUIDE.md` for detailed instructions
   - Update `lib/watsonx.ts` with actual implementation
   - Update `app/api/generate/route.ts` to use the helper

3. **Add Schema Generation Logic**
   - Create `lib/generators/prisma-generator.ts`
   - Create `lib/generators/route-generator.ts`
   - See `IMPLEMENTATION_GUIDE.md` for code examples

4. **Add ERD Parsing**
   - Create `lib/parsers/erd-parser.ts`
   - Parse AI response into structured data
   - Validate extracted entities and relationships

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

## Troubleshooting

### TypeScript Errors

The project will show TypeScript errors until you run `npm install`. This is normal and expected.

### Missing Dependencies

If you see module not found errors:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

If port 3000 is already in use:
```bash
npm run dev -- -p 3001
```

## Testing the Application

1. **Start the dev server**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Upload an ERD image**: Drag and drop or click to select
4. **View results**: You'll be redirected to the results page
5. **Edit code**: Both editors are editable
6. **Download files**: Use the download buttons

## Current Limitations

- watsonx.ai integration is not yet implemented (returns mock data)
- No actual ERD analysis (placeholder logic)
- No database persistence
- No user authentication

## Documentation

- **ARCHITECTURE.md** - Complete system architecture
- **WATSONX_INTEGRATION_GUIDE.md** - Detailed watsonx.ai setup
- **IMPLEMENTATION_GUIDE.md** - Step-by-step implementation
- **VISUAL_SUMMARY.md** - Visual diagrams and flowcharts

## Support

For issues or questions:
1. Check the documentation files
2. Review the code comments
3. See the example implementations in the guides

---

**Ready to build!** 🚀