# Foundry - Architecture Plan

## Project Overview
Foundry is a Next.js 14 App Router application that allows developers to upload ERD diagram images and automatically generate Prisma schema files and Next.js API routes with full CRUD operations.

## Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Prisma
- **AI Service**: watsonx.ai Vision Model
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (recommended)
- **File Handling**: Next.js built-in file upload

## File Structure

```
foundry/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page with upload
│   ├── globals.css                   # Global styles
│   ├── api/
│   │   ├── analyze-erd/
│   │   │   └── route.ts             # POST: Upload & analyze ERD image
│   │   ├── generate-schema/
│   │   │   └── route.ts             # POST: Generate schema.prisma
│   │   └── generate-routes/
│   │       └── route.ts             # POST: Generate API routes
│   └── preview/
│       └── page.tsx                  # Schema preview & editor page
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── upload/
│   │   ├── ImageUploader.tsx        # Drag & drop upload component
│   │   └── ImagePreview.tsx         # Display uploaded image
│   ├── schema/
│   │   ├── SchemaEditor.tsx         # Interactive schema editor
│   │   ├── EntityCard.tsx           # Individual entity display/edit
│   │   ├── RelationshipEditor.tsx   # Edit relationships
│   │   └── FieldEditor.tsx          # Edit entity fields
│   ├── generation/
│   │   ├── CodePreview.tsx          # Show generated code
│   │   ├── FileDownloader.tsx       # Download generated files
│   │   └── GenerationProgress.tsx   # Loading states
│   └── layout/
│       ├── Header.tsx                # App header
│       └── Footer.tsx                # App footer
├── lib/
│   ├── watsonx/
│   │   ├── client.ts                # watsonx.ai API client
│   │   ├── vision.ts                # Vision model integration
│   │   └── types.ts                 # watsonx types
│   ├── parsers/
│   │   ├── erd-parser.ts            # Parse AI response to schema structure
│   │   ├── entity-extractor.ts      # Extract entities from parsed data
│   │   └── relationship-mapper.ts   # Map relationships between entities
│   ├── generators/
│   │   ├── prisma-generator.ts      # Generate schema.prisma content
│   │   ├── route-generator.ts       # Generate API route files
│   │   └── crud-templates.ts        # CRUD operation templates
│   ├── validators/
│   │   ├── schema-validator.ts      # Validate schema structure
│   │   └── field-validator.ts       # Validate field types
│   └── utils/
│       ├── file-utils.ts            # File handling utilities
│       ├── format-utils.ts          # Code formatting utilities
│       └── zip-utils.ts             # Create zip archives
├── types/
│   ├── schema.ts                     # Schema-related types
│   ├── entity.ts                     # Entity types
│   └── api.ts                        # API response types
├── prisma/
│   └── schema.prisma                 # Prisma schema (for app's own DB)
├── public/
│   └── examples/                     # Example ERD images
├── .env.local                        # Environment variables
├── .env.example                      # Example env file
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies
```

## Core Components Architecture

### 1. Upload Flow Components

#### ImageUploader Component
```typescript
// components/upload/ImageUploader.tsx
- Drag & drop interface
- File validation (image types, size limits)
- Preview thumbnail
- Upload progress indicator
```

#### ImagePreview Component
```typescript
// components/upload/ImagePreview.tsx
- Display uploaded ERD image
- Zoom/pan functionality
- Clear/replace image option
```

### 2. Schema Editor Components

#### SchemaEditor Component
```typescript
// components/schema/SchemaEditor.tsx
- Main container for schema editing
- Add/remove entities
- Manage relationships
- Validation feedback
```

#### EntityCard Component
```typescript
// components/schema/EntityCard.tsx
- Display entity name and fields
- Inline editing capabilities
- Field type selection
- Add/remove fields
- Set primary keys, unique constraints
```

#### RelationshipEditor Component
```typescript
// components/schema/RelationshipEditor.tsx
- Visual relationship mapping
- One-to-one, one-to-many, many-to-many
- Cascade options
- Relationship naming
```

### 3. Generation Components

#### CodePreview Component
```typescript
// components/generation/CodePreview.tsx
- Syntax-highlighted code display
- Tabs for different files
- Copy to clipboard functionality
```

#### FileDownloader Component
```typescript
// components/generation/FileDownloader.tsx
- Download individual files
- Download all as ZIP
- File structure preview
```

## API Route Design

### 1. Analyze ERD Endpoint
```typescript
// app/api/analyze-erd/route.ts
POST /api/analyze-erd

Request:
- multipart/form-data with image file
- Max size: 10MB
- Supported formats: PNG, JPG, JPEG

Response:
{
  success: boolean;
  data: {
    entities: Array<{
      name: string;
      fields: Array<{
        name: string;
        type: string;
        required: boolean;
        unique: boolean;
        default?: string;
      }>;
    }>;
    relationships: Array<{
      from: string;
      to: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-many';
      fromField: string;
      toField: string;
    }>;
  };
  error?: string;
}
```

### 2. Generate Schema Endpoint
```typescript
// app/api/generate-schema/route.ts
POST /api/generate-schema

Request:
{
  entities: Entity[];
  relationships: Relationship[];
  database: 'sqlite' | 'postgresql';
}

Response:
{
  success: boolean;
  data: {
    schemaContent: string;
    fileName: 'schema.prisma';
  };
  error?: string;
}
```

### 3. Generate Routes Endpoint
```typescript
// app/api/generate-routes/route.ts
POST /api/generate-routes

Request:
{
  entities: Entity[];
  includeOperations: ['create', 'read', 'update', 'delete'];
}

Response:
{
  success: boolean;
  data: {
    routes: Array<{
      path: string;
      fileName: string;
      content: string;
    }>;
  };
  error?: string;
}
```

## watsonx.ai Integration

### Vision Model Setup

```typescript
// lib/watsonx/client.ts
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';

export class WatsonXClient {
  private client: WatsonXAI;
  
  constructor() {
    this.client = new WatsonXAI({
      version: '2024-05-31',
      serviceUrl: process.env.WATSONX_URL,
      authenticator: {
        apikey: process.env.WATSONX_API_KEY,
      },
    });
  }
  
  async analyzeImage(imageBuffer: Buffer): Promise<string> {
    // Convert image to base64
    // Call vision model
    // Return structured response
  }
}
```

### Vision API Call Flow

```mermaid
graph TD
    A[Upload Image] --> B[Convert to Base64]
    B --> C[Send to watsonx.ai Vision API]
    C --> D[Receive AI Response]
    D --> E[Parse Response Text]
    E --> F[Extract Entities & Relationships]
    F --> G[Validate Structure]
    G --> H[Return Parsed Schema]
```

### Prompt Engineering for ERD Analysis

```typescript
// lib/watsonx/vision.ts
const ERD_ANALYSIS_PROMPT = `
Analyze this Entity Relationship Diagram (ERD) image and extract:

1. All entities (tables) with their names
2. For each entity, list all fields/attributes with:
   - Field name
   - Data type (string, integer, boolean, datetime, etc.)
   - Constraints (primary key, unique, required/optional)
3. All relationships between entities:
   - Source entity
   - Target entity
   - Relationship type (one-to-one, one-to-many, many-to-many)
   - Foreign key fields

Return the information in this JSON format:
{
  "entities": [
    {
      "name": "User",
      "fields": [
        {"name": "id", "type": "Int", "primaryKey": true, "required": true},
        {"name": "email", "type": "String", "unique": true, "required": true}
      ]
    }
  ],
  "relationships": [
    {
      "from": "User",
      "to": "Post",
      "type": "one-to-many",
      "fromField": "posts",
      "toField": "author"
    }
  ]
}
`;
```

## UI Flow

### Complete User Journey

```mermaid
graph TD
    A[Landing Page] --> B[Upload ERD Image]
    B --> C{Image Valid?}
    C -->|No| B
    C -->|Yes| D[Show Loading State]
    D --> E[Call watsonx.ai API]
    E --> F[Parse AI Response]
    F --> G[Display Schema Preview]
    G --> H{User Action}
    H -->|Edit| I[Open Schema Editor]
    I --> J[Modify Entities/Relationships]
    J --> G
    H -->|Generate| K[Generate Files]
    K --> L[Show Generated Code]
    L --> M{User Action}
    M -->|Download Individual| N[Download File]
    M -->|Download All| O[Download ZIP]
    M -->|Start Over| A
```

### Page-by-Page Flow

#### 1. Home Page (app/page.tsx)
- Hero section with project description
- Large upload area (drag & drop)
- Example ERD images
- "How it works" section

#### 2. Preview Page (app/preview/page.tsx)
- Uploaded image display (left panel)
- Detected schema editor (right panel)
- Entity cards with inline editing
- Relationship visualization
- "Generate Files" button

#### 3. Results Page (embedded in preview)
- Tabbed interface for generated files
- schema.prisma preview
- API routes preview (one tab per entity)
- Download options
- "Start New" button

## Data Flow Architecture

```mermaid
graph LR
    A[User Uploads Image] --> B[Next.js API Route]
    B --> C[watsonx.ai Vision API]
    C --> D[AI Response Text]
    D --> E[ERD Parser]
    E --> F[Validated Schema Object]
    F --> G[Schema Editor UI]
    G --> H{User Edits}
    H --> I[Updated Schema Object]
    I --> J[Prisma Generator]
    I --> K[Route Generator]
    J --> L[schema.prisma File]
    K --> M[API Route Files]
    L --> N[Download/Export]
    M --> N
```

## Generator Logic

### Prisma Schema Generator

```typescript
// lib/generators/prisma-generator.ts
export function generatePrismaSchema(
  entities: Entity[],
  relationships: Relationship[],
  database: 'sqlite' | 'postgresql'
): string {
  // 1. Generate datasource block
  // 2. Generate generator block
  // 3. For each entity, generate model block
  // 4. Add fields with proper types
  // 5. Add relationships with @relation
  // 6. Add indexes and constraints
  // 7. Format and return complete schema
}
```

### API Route Generator

```typescript
// lib/generators/route-generator.ts
export function generateCRUDRoutes(entity: Entity): RouteFile[] {
  return [
    generateGETRoute(entity),      // GET /api/[entity]
    generateGETByIdRoute(entity),  // GET /api/[entity]/[id]
    generatePOSTRoute(entity),     // POST /api/[entity]
    generatePUTRoute(entity),      // PUT /api/[entity]/[id]
    generateDELETERoute(entity),   // DELETE /api/[entity]/[id]
  ];
}
```

### CRUD Template Structure

```typescript
// lib/generators/crud-templates.ts

// GET all items
export const GET_ALL_TEMPLATE = `
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.{{modelName}}.findMany({
      include: {{includes}},
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch {{modelName}}' },
      { status: 500 }
    );
  }
}
`;

// POST create item
export const POST_TEMPLATE = `
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await prisma.{{modelName}}.create({
      data: body,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create {{modelName}}' },
      { status: 500 }
    );
  }
}
`;

// Similar templates for PUT, DELETE, GET by ID
```

## Type Definitions

### Core Types

```typescript
// types/schema.ts
export interface Entity {
  id: string;
  name: string;
  fields: Field[];
}

export interface Field {
  id: string;
  name: string;
  type: PrismaFieldType;
  required: boolean;
  unique: boolean;
  primaryKey: boolean;
  defaultValue?: string;
  relation?: RelationInfo;
}

export type PrismaFieldType = 
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'DateTime'
  | 'Json'
  | 'Bytes';

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  fromField: string;
  toField: string;
  onDelete?: 'Cascade' | 'SetNull' | 'Restrict';
}

export interface GeneratedFile {
  path: string;
  fileName: string;
  content: string;
  language: 'prisma' | 'typescript';
}
```

## Environment Variables

```bash
# .env.example

# watsonx.ai Configuration
WATSONX_API_KEY=your_api_key_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id

# Database URLs
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="postgresql://user:password@localhost:5432/foundry"  # PostgreSQL for production

# App Configuration
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10MB in bytes
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/png,image/jpeg,image/jpg
```

## Error Handling Strategy

### Client-Side Errors
- File validation errors (size, type)
- Network errors during upload
- Invalid schema structure
- Generation failures

### Server-Side Errors
- watsonx.ai API failures
- Rate limiting
- Invalid AI responses
- File generation errors

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: 'WATSONX_API_ERROR',
    message: 'Failed to analyze image',
    details?: any
  }
}
```

## Performance Considerations

1. **Image Upload**: Compress images client-side before upload
2. **AI Processing**: Show progress indicators, implement timeout handling
3. **Code Generation**: Generate files asynchronously
4. **File Download**: Stream large files, use ZIP compression
5. **Caching**: Cache watsonx.ai responses for identical images

## Security Considerations

1. **File Upload**: Validate file types and sizes
2. **API Keys**: Store in environment variables, never expose client-side
3. **Input Validation**: Sanitize all user inputs
4. **Rate Limiting**: Implement rate limiting on API routes
5. **CORS**: Configure appropriate CORS policies

## Testing Strategy

1. **Unit Tests**: Test parsers, generators, validators
2. **Integration Tests**: Test API routes end-to-end
3. **E2E Tests**: Test complete user flow with Playwright
4. **Visual Tests**: Test with various ERD diagram styles
5. **Error Tests**: Test error handling scenarios

## Deployment Considerations

### Development
- Use SQLite for quick setup
- Mock watsonx.ai responses for testing
- Hot reload for rapid development

### Production
- Switch to PostgreSQL
- Set up proper environment variables
- Configure CDN for static assets
- Implement monitoring and logging
- Set up error tracking (e.g., Sentry)

## Future Enhancements

1. **Multiple Database Support**: MySQL, MongoDB
2. **Export Formats**: TypeScript types, GraphQL schema
3. **Template Library**: Pre-built ERD templates
4. **Collaboration**: Share and edit schemas
5. **Version Control**: Track schema changes
6. **AI Improvements**: Fine-tune prompts, support hand-drawn ERDs
7. **Code Generation**: Generate full Next.js app structure
8. **Migration Generator**: Generate Prisma migration files

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.0.0",
    "@ibm-cloud/watsonx-ai": "latest",
    "zod": "^3.22.0",
    "jszip": "^3.10.0",
    "react-dropzone": "^14.2.0",
    "prism-react-renderer": "^2.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "prisma": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## Getting Started Checklist

- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Install and configure Prisma
- [ ] Set up Tailwind CSS
- [ ] Install shadcn/ui components
- [ ] Configure environment variables
- [ ] Set up watsonx.ai API client
- [ ] Create basic file structure
- [ ] Implement upload functionality
- [ ] Integrate watsonx.ai vision model
- [ ] Build schema parser
- [ ] Create schema editor UI
- [ ] Implement file generators
- [ ] Add download functionality
- [ ] Test end-to-end flow
- [ ] Deploy to Vercel/production

---

This architecture provides a solid foundation for building Foundry. The modular structure allows for easy testing, maintenance, and future enhancements.