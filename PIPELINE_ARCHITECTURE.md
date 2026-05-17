# Production-Grade ERD Pipeline Architecture

## Overview

This document describes the production-grade ERD extraction pipeline that separates AI extraction from deterministic code generation.

## Architecture Principles

1. **Separation of Concerns**: AI only extracts structure, generators produce code
2. **Type Safety**: Strongly-typed TypeScript throughout
3. **Deterministic Output**: Same AST always produces same code
4. **Validation Layer**: Normalize and validate before generation
5. **Modular Design**: Each component has single responsibility

## Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│                    ERD Image Upload                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: AI Extraction (lib/ai/extractor.ts)               │
│  ─────────────────────────────────────────────────────────  │
│  • watsonx.ai Vision Model                                   │
│  • Extracts ONLY structured JSON                             │
│  • Returns: { tables: [], relations: [] }                   │
│  • NO code generation at this stage                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 2: AST Building (lib/parser/ast-builder.ts)          │
│  ─────────────────────────────────────────────────────────  │
│  • Converts AI JSON to strongly-typed ERDAST                 │
│  • Maps field types (string → String, number → Int)          │
│  • Maps relation types (one-to-many, etc.)                   │
│  • Normalizes names (PascalCase, camelCase)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 3: Validation (lib/validators/erd-validator.ts)      │
│  ─────────────────────────────────────────────────────────  │
│  • Remove self-relations                                     │
│  • Remove duplicate models                                   │
│  • Normalize all names                                       │
│  • Infer missing inverse relations                           │
│  • Add foreign key fields                                    │
│  • Validate FK consistency                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Stage 4: Code Generation (lib/generators/*.ts)             │
│  ─────────────────────────────────────────────────────────  │
│  • Prisma Schema Generator                                   │
│  • API Routes Generator                                      │
│  • Zod Schemas Generator                                     │
│  • Seed Script Generator                                     │
│  • Mermaid Diagram Generator                                 │
│  • All deterministic from validated AST                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Generated Code Output                     │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
lib/
├── ai/
│   └── extractor.ts          # AI extraction layer
├── parser/
│   └── ast-builder.ts        # JSON to AST conversion
├── validators/
│   └── erd-validator.ts      # AST validation & normalization
├── generators/
│   ├── prisma-generator.ts   # Prisma schema generation
│   ├── api-generator.ts      # API routes generation
│   ├── zod-generator.ts      # Zod schemas generation
│   ├── seed-generator.ts     # Seed script generation
│   └── mermaid-generator.ts  # Mermaid diagram generation
├── pipeline/
│   └── orchestrator.ts       # Main pipeline coordinator
└── utils/
    └── string.ts             # String utilities

types/
└── erd.ts                    # Type definitions
```

## Type Definitions

### Core Types

```typescript
// ERD Field
interface ERDField {
  name: string;
  type: PrismaFieldType;
  isRequired: boolean;
  isUnique: boolean;
  isArray: boolean;
  defaultValue?: string | number | boolean;
}

// ERD Table
interface ERDTable {
  name: string;
  fields: ERDField[];
}

// ERD Relation
interface ERDRelation {
  name: string;
  from: string;
  to: string;
  type: RelationType;
  fromField?: string;
  toField?: string;
  onDelete?: 'Cascade' | 'SetNull' | 'Restrict';
}

// Complete AST
interface ERDAST {
  tables: ERDTable[];
  relations: ERDRelation[];
}

// Validated AST
interface ValidatedERDAST extends ERDAST {
  validated: true;
  timestamp: string;
}
```

## Validation Rules

### 1. Name Normalization
- **Model names**: Singular PascalCase (User, not Users)
- **Field names**: camelCase (userId, not user_id)
- **Relation names**: camelCase descriptive names

### 2. Relation Rules
- **No self-relations**: Table cannot relate to itself
- **Bidirectional**: Every relation has inverse
- **FK fields**: Automatically added for many-to-one relations
- **Consistency**: All relations reference existing tables

### 3. Field Rules
- **System fields**: id, createdAt, updatedAt added automatically
- **FK fields**: Named as `{model}Id` (e.g., userId)
- **Types**: Mapped to Prisma types (String, Int, Float, Boolean, DateTime, Json)

## Generator Behavior

### Prisma Schema Generator
```typescript
// Input: ValidatedERDAST
// Output: Complete Prisma schema string

// Always includes:
- datasource block (with correct provider)
- generator block
- All models with:
  - id Int @id @default(autoincrement())
  - User fields
  - FK fields with @relation directives
  - createdAt DateTime @default(now())
  - updatedAt DateTime @updatedAt
```

### API Routes Generator
```typescript
// Input: ValidatedERDAST
// Output: Complete API routes with CRUD

// For each model generates:
- GET /api/[model] - Get all
- GET /api/[model]/[id] - Get by ID
- POST /api/[model] - Create
- PUT /api/[model]/[id] - Update
- DELETE /api/[model]/[id] - Delete
```

### Zod Schemas Generator
```typescript
// Input: ValidatedERDAST
// Output: Zod validation schemas

// For each model generates:
- Create[Model]Schema - All fields except id, timestamps, FKs
- Update[Model]Schema - Same fields but all optional
- Type inference exports
```

### Seed Script Generator
```typescript
// Input: ValidatedERDAST
// Output: Prisma seed script with faker

// For each model:
- Creates 10 records
- Uses intelligent faker mapping
- Handles relations properly
```

### Mermaid Diagram Generator
```typescript
// Input: ValidatedERDAST
// Output: Mermaid ER diagram syntax

// Includes:
- All entities with fields
- All relationships with cardinality
- Field types and constraints
```

## Usage Example

```typescript
import { processERDImage } from '@/lib/pipeline/orchestrator';

// Process ERD image
const result = await processERDImage(imageBuffer, 'postgresql');

// Result contains:
result.prismaSchema    // Complete Prisma schema
result.apiRoutes       // Complete API routes
result.zodSchemas      // Zod validation schemas
result.seedScript      // Seed script with faker
result.mermaidDiagram  // Mermaid ER diagram
```

## Benefits

### 1. Reliability
- **Deterministic**: Same input always produces same output
- **No AI formatting issues**: Generators control all formatting
- **Type-safe**: TypeScript catches errors at compile time

### 2. Maintainability
- **Modular**: Each component has single responsibility
- **Testable**: Each stage can be tested independently
- **Extensible**: Easy to add new generators

### 3. Quality
- **Validation**: Multiple validation passes ensure correctness
- **Normalization**: Consistent naming conventions
- **Best practices**: Follows Prisma and Next.js conventions

### 4. Scalability
- **Reusable**: Generators can be used independently
- **Composable**: Easy to create custom pipelines
- **Production-ready**: Enterprise-grade architecture

## Error Handling

Each stage has proper error handling:

```typescript
try {
  // Stage 1: AI Extraction
  const aiResult = await extractERDStructure(imageBuffer);
  
  // Stage 2: AST Building
  const ast = buildERDAST(aiResult);
  
  // Stage 3: Validation
  const validatedAST = validateERDAST(ast);
  
  // Stage 4: Generation
  const code = generateAllCode(validatedAST);
  
} catch (error) {
  // Detailed error messages at each stage
  console.error('Pipeline error:', error);
}
```

## Testing Strategy

### Unit Tests
- Test each generator independently
- Test validation rules
- Test string utilities

### Integration Tests
- Test complete pipeline
- Test with various ERD inputs
- Test error scenarios

### Example Test
```typescript
describe('Prisma Generator', () => {
  it('should generate valid Prisma schema', () => {
    const ast = createTestAST();
    const schema = generatePrismaSchema(ast);
    expect(schema).toContain('datasource db');
    expect(schema).toContain('generator client');
    expect(schema).toContain('model User');
  });
});
```

## Performance

- **AI Extraction**: ~5-10 seconds (watsonx.ai)
- **AST Building**: <100ms
- **Validation**: <100ms
- **Code Generation**: <500ms
- **Total**: ~6-11 seconds

## Future Enhancements

1. **Caching**: Cache validated ASTs
2. **Incremental**: Support schema updates
3. **Templates**: Custom generator templates
4. **Plugins**: Extensible generator system
5. **CLI**: Command-line interface
6. **Web UI**: Visual AST editor

## Conclusion

This architecture provides a production-grade, maintainable, and scalable solution for ERD extraction and code generation. By separating AI extraction from deterministic generation, we ensure reliability and consistency while maintaining flexibility for future enhancements.