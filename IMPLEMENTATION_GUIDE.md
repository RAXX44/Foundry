# Foundry - Step-by-Step Implementation Guide

This guide provides a practical, step-by-step approach to building the Foundry application.

## Phase 1: Project Setup (Day 1)

### Step 1: Initialize Next.js Project

```bash
# Create Next.js 14 project with TypeScript
npx create-next-app@latest foundry --typescript --tailwind --app --no-src-dir

cd foundry

# Install core dependencies
npm install @prisma/client zod
npm install -D prisma

# Install watsonx.ai SDK
npm install @ibm-cloud/watsonx-ai ibm-cloud-sdk-core

# Install UI dependencies
npm install react-dropzone jszip prism-react-renderer
npm install lucide-react class-variance-authority clsx tailwind-merge

# Install shadcn/ui
npx shadcn-ui@latest init
```

### Step 2: Configure shadcn/ui Components

```bash
# Install required shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add select
npx shadcn-ui@latest add separator
```

### Step 3: Initialize Prisma

```bash
# Initialize Prisma with SQLite
npx prisma init --datasource-provider sqlite
```

Update [`prisma/schema.prisma`](prisma/schema.prisma):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Example model for storing analysis history (optional)
model Analysis {
  id          String   @id @default(cuid())
  imageUrl    String
  schemaData  String   // JSON string of detected schema
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

```bash
# Generate Prisma Client
npx prisma generate

# Create database
npx prisma db push
```

### Step 4: Set Up Environment Variables

Create [`.env.local`](.env.local):

```bash
# Database
DATABASE_URL="file:./dev.db"

# watsonx.ai Configuration
WATSONX_API_KEY=your_api_key_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id_here

# App Configuration
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/png,image/jpeg,image/jpg
```

Create [`.env.example`](.env.example) with placeholder values.

### Step 5: Create Base Directory Structure

```bash
# Create directory structure
mkdir -p lib/watsonx
mkdir -p lib/parsers
mkdir -p lib/generators
mkdir -p lib/validators
mkdir -p lib/utils
mkdir -p components/upload
mkdir -p components/schema
mkdir -p components/generation
mkdir -p components/layout
mkdir -p types
mkdir -p app/api/analyze-erd
mkdir -p app/api/generate-schema
mkdir -p app/api/generate-routes
mkdir -p app/preview
mkdir -p public/examples
```

## Phase 2: Core Types & Utilities (Day 1-2)

### Step 6: Define Core Types

Create [`types/schema.ts`](types/schema.ts):

```typescript
export type PrismaFieldType = 
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'DateTime'
  | 'Json'
  | 'Bytes';

export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';

export type CascadeAction = 'Cascade' | 'SetNull' | 'Restrict' | 'NoAction';

export interface Field {
  id: string;
  name: string;
  type: PrismaFieldType;
  required: boolean;
  unique: boolean;
  primaryKey: boolean;
  defaultValue?: string;
  isArray?: boolean;
}

export interface Entity {
  id: string;
  name: string;
  fields: Field[];
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  fromField: string;
  toField: string;
  onDelete?: CascadeAction;
}

export interface ERDSchema {
  entities: Entity[];
  relationships: Relationship[];
}

export interface GeneratedFile {
  path: string;
  fileName: string;
  content: string;
  language: 'prisma' | 'typescript';
}
```

Create [`types/api.ts`](types/api.ts):

```typescript
import { ERDSchema, GeneratedFile } from './schema';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AnalyzeERDResponse extends ApiResponse<ERDSchema> {}

export interface GenerateSchemaRequest {
  entities: Entity[];
  relationships: Relationship[];
  database: 'sqlite' | 'postgresql';
}

export interface GenerateSchemaResponse extends ApiResponse<{
  schemaContent: string;
  fileName: string;
}> {}

export interface GenerateRoutesRequest {
  entities: Entity[];
  includeOperations: ('create' | 'read' | 'update' | 'delete')[];
}

export interface GenerateRoutesResponse extends ApiResponse<{
  routes: GeneratedFile[];
}> {}
```

### Step 7: Create Utility Functions

Create [`lib/utils/file-utils.ts`](lib/utils/file-utils.ts):

```typescript
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760');
  const allowedTypes = (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/png,image/jpeg,image/jpg').split(',');

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(2)}MB limit`,
    };
  }

  return { valid: true };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

Create [`lib/utils/format-utils.ts`](lib/utils/format-utils.ts):

```typescript
export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/\s+/g, '');
}

export function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
    .replace(/\s+/g, '');
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

export function pluralize(word: string): string {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s')) {
    return word + 'es';
  }
  return word + 's';
}
```

## Phase 3: watsonx.ai Integration (Day 2-3)

### Step 8: Implement watsonx.ai Client

Follow the detailed instructions in [`WATSONX_INTEGRATION_GUIDE.md`](WATSONX_INTEGRATION_GUIDE.md) to create:

- [`lib/watsonx/client.ts`](lib/watsonx/client.ts)
- [`lib/watsonx/vision.ts`](lib/watsonx/vision.ts)
- [`lib/watsonx/errors.ts`](lib/watsonx/errors.ts)

### Step 9: Create ERD Parser

Create [`lib/parsers/erd-parser.ts`](lib/parsers/erd-parser.ts):

```typescript
import { ERDSchema, Entity, Relationship } from '@/types/schema';
import { generateId } from '@/lib/utils/file-utils';

export class ERDParser {
  parse(rawResponse: string): ERDSchema {
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                     rawResponse.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    return {
      entities: this.parseEntities(parsed.entities || []),
      relationships: this.parseRelationships(parsed.relationships || []),
    };
  }

  private parseEntities(rawEntities: any[]): Entity[] {
    return rawEntities.map(entity => ({
      id: generateId(),
      name: entity.name,
      fields: entity.fields.map((field: any) => ({
        id: generateId(),
        name: field.name,
        type: field.type,
        required: field.required ?? true,
        unique: field.unique ?? false,
        primaryKey: field.primaryKey ?? false,
        defaultValue: field.defaultValue,
        isArray: field.isArray ?? false,
      })),
    }));
  }

  private parseRelationships(rawRelationships: any[]): Relationship[] {
    return rawRelationships.map(rel => ({
      id: generateId(),
      from: rel.from,
      to: rel.to,
      type: rel.type,
      fromField: rel.fromField,
      toField: rel.toField,
      onDelete: rel.onDelete || 'Cascade',
    }));
  }
}

export const erdParser = new ERDParser();
```

## Phase 4: File Generators (Day 3-4)

### Step 10: Implement Prisma Schema Generator

Create [`lib/generators/prisma-generator.ts`](lib/generators/prisma-generator.ts):

```typescript
import { Entity, Relationship, ERDSchema } from '@/types/schema';

export class PrismaGenerator {
  generate(schema: ERDSchema, database: 'sqlite' | 'postgresql'): string {
    const parts: string[] = [];

    // Add datasource
    parts.push(this.generateDatasource(database));
    parts.push('');

    // Add generator
    parts.push(this.generateGenerator());
    parts.push('');

    // Add models
    schema.entities.forEach(entity => {
      parts.push(this.generateModel(entity, schema.relationships));
      parts.push('');
    });

    return parts.join('\n');
  }

  private generateDatasource(database: 'sqlite' | 'postgresql'): string {
    return `datasource db {
  provider = "${database}"
  url      = env("DATABASE_URL")
}`;
  }

  private generateGenerator(): string {
    return `generator client {
  provider = "prisma-client-js"
}`;
  }

  private generateModel(entity: Entity, relationships: Relationship[]): string {
    const lines: string[] = [`model ${entity.name} {`];

    // Add fields
    entity.fields.forEach(field => {
      const parts: string[] = [
        `  ${field.name}`,
        field.type + (field.isArray ? '[]' : ''),
      ];

      const attributes: string[] = [];
      if (field.primaryKey) attributes.push('@id @default(autoincrement())');
      if (field.unique && !field.primaryKey) attributes.push('@unique');
      if (!field.required) parts[1] += '?';
      if (field.defaultValue) attributes.push(`@default(${field.defaultValue})`);

      if (attributes.length > 0) {
        parts.push(attributes.join(' '));
      }

      lines.push(parts.join(' '));
    });

    // Add relationships
    const entityRelationships = relationships.filter(
      r => r.from === entity.name || r.to === entity.name
    );

    entityRelationships.forEach(rel => {
      if (rel.from === entity.name) {
        const optional = rel.type === 'one-to-one' ? '?' : '';
        const array = rel.type === 'one-to-many' ? '[]' : '';
        lines.push(`  ${rel.fromField} ${rel.to}${optional}${array}`);
      }
    });

    lines.push('}');
    return lines.join('\n');
  }
}

export const prismaGenerator = new PrismaGenerator();
```

### Step 11: Implement API Route Generator

Create [`lib/generators/route-generator.ts`](lib/generators/route-generator.ts):

```typescript
import { Entity, GeneratedFile } from '@/types/schema';
import { toCamelCase, pluralize } from '@/lib/utils/format-utils';

export class RouteGenerator {
  generateAll(entities: Entity[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    entities.forEach(entity => {
      const modelName = toCamelCase(entity.name);
      const routePath = pluralize(modelName.toLowerCase());

      // Generate main route file (GET all, POST)
      files.push({
        path: `app/api/${routePath}/route.ts`,
        fileName: 'route.ts',
        content: this.generateMainRoute(entity),
        language: 'typescript',
      });

      // Generate [id] route file (GET one, PUT, DELETE)
      files.push({
        path: `app/api/${routePath}/[id]/route.ts`,
        fileName: 'route.ts',
        content: this.generateIdRoute(entity),
        language: 'typescript',
      });
    });

    return files;
  }

  private generateMainRoute(entity: Entity): string {
    const modelName = toCamelCase(entity.name);
    
    return `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/${pluralize(modelName.toLowerCase())}
export async function GET() {
  try {
    const items = await prisma.${modelName}.findMany();
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching ${modelName}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ${modelName}' },
      { status: 500 }
    );
  }
}

// POST /api/${pluralize(modelName.toLowerCase())}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await prisma.${modelName}.create({
      data: body,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating ${modelName}:', error);
    return NextResponse.json(
      { error: 'Failed to create ${modelName}' },
      { status: 500 }
    );
  }
}`;
  }

  private generateIdRoute(entity: Entity): string {
    const modelName = toCamelCase(entity.name);
    const primaryKey = entity.fields.find(f => f.primaryKey);
    const pkType = primaryKey?.type === 'Int' ? 'parseInt(params.id)' : 'params.id';
    
    return `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/${pluralize(modelName.toLowerCase())}/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.${modelName}.findUnique({
      where: { id: ${pkType} },
    });

    if (!item) {
      return NextResponse.json(
        { error: '${entity.name} not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching ${modelName}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ${modelName}' },
      { status: 500 }
    );
  }
}

// PUT /api/${pluralize(modelName.toLowerCase())}/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const item = await prisma.${modelName}.update({
      where: { id: ${pkType} },
      data: body,
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating ${modelName}:', error);
    return NextResponse.json(
      { error: 'Failed to update ${modelName}' },
      { status: 500 }
    );
  }
}

// DELETE /api/${pluralize(modelName.toLowerCase())}/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.${modelName}.delete({
      where: { id: ${pkType} },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ${modelName}:', error);
    return NextResponse.json(
      { error: 'Failed to delete ${modelName}' },
      { status: 500 }
    );
  }
}`;
  }
}

export const routeGenerator = new RouteGenerator();
```

## Phase 5: API Routes (Day 4-5)

### Step 12: Create API Endpoints

Create [`app/api/analyze-erd/route.ts`](app/api/analyze-erd/route.ts) - See watsonx integration guide

Create [`app/api/generate-schema/route.ts`](app/api/generate-schema/route.ts):

```typescript
import { NextResponse } from 'next/server';
import { prismaGenerator } from '@/lib/generators/prisma-generator';
import { GenerateSchemaRequest } from '@/types/api';

export async function POST(request: Request) {
  try {
    const body: GenerateSchemaRequest = await request.json();
    
    const schemaContent = prismaGenerator.generate(
      {
        entities: body.entities,
        relationships: body.relationships,
      },
      body.database
    );

    return NextResponse.json({
      success: true,
      data: {
        schemaContent,
        fileName: 'schema.prisma',
      },
    });
  } catch (error) {
    console.error('Schema generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate schema',
      },
      { status: 500 }
    );
  }
}
```

Create [`app/api/generate-routes/route.ts`](app/api/generate-routes/route.ts):

```typescript
import { NextResponse } from 'next/server';
import { routeGenerator } from '@/lib/generators/route-generator';
import { GenerateRoutesRequest } from '@/types/api';

export async function POST(request: Request) {
  try {
    const body: GenerateRoutesRequest = await request.json();
    
    const routes = routeGenerator.generateAll(body.entities);

    return NextResponse.json({
      success: true,
      data: { routes },
    });
  } catch (error) {
    console.error('Route generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate routes',
      },
      { status: 500 }
    );
  }
}
```

## Phase 6: UI Components (Day 5-7)

### Step 13: Create Upload Component

Create [`components/upload/ImageUploader.tsx`](components/upload/ImageUploader.tsx):

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateImageFile } from '@/lib/utils/file-utils';

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

export function ImageUploader({ onUpload, isLoading }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    onUpload(file);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    disabled: isLoading,
  });

  const clearPreview = () => {
    setPreview(null);
    setError(null);
  };

  if (preview) {
    return (
      <div className="relative">
        <img src={preview} alt="ERD Preview" className="max-w-full h-auto rounded-lg" />
        {!isLoading && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={clearPreview}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium mb-2">
        {isDragActive ? 'Drop your ERD here' : 'Upload ERD Diagram'}
      </p>
      <p className="text-sm text-gray-500">
        Drag & drop or click to select (PNG, JPG up to 10MB)
      </p>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
```

### Step 14-20: Create Remaining Components

Due to length constraints, create these components following the patterns in [`ARCHITECTURE.md`](ARCHITECTURE.md):

- Schema Editor Components
- Code Preview Components
- Download Components
- Layout Components

## Phase 7: Pages (Day 7-8)

### Step 21: Create Home Page

Update [`app/page.tsx`](app/page.tsx) with upload interface

### Step 22: Create Preview Page

Create [`app/preview/page.tsx`](app/preview/page.tsx) with schema editor

## Phase 8: Testing & Polish (Day 8-10)

### Step 23: Add Error Handling
### Step 24: Implement Loading States
### Step 25: Add Validation
### Step 26: Create Documentation
### Step 27: Test End-to-End Flow

## Quick Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Prisma commands
npx prisma generate
npx prisma db push
npx prisma studio

# Type checking
npm run type-check

# Linting
npm run lint
```

## Next Steps

After completing the implementation:

1. Test with various ERD diagrams
2. Gather user feedback
3. Optimize performance
4. Add more features
5. Deploy to production

Refer to [`ARCHITECTURE.md`](ARCHITECTURE.md) for detailed architecture and [`WATSONX_INTEGRATION_GUIDE.md`](WATSONX_INTEGRATION_GUIDE.md) for watsonx.ai specifics.