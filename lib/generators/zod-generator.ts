/**
 * Zod Schemas Generator
 * Generates Zod validation schemas from ERD AST
 */

import type { ValidatedERDAST, ERDTable, ERDField, PrismaFieldType } from '@/types/erd';
import { toCamelCase } from '@/lib/utils/string';

/**
 * Map Prisma type to Zod type
 */
function mapToZodType(prismaType: PrismaFieldType, field: ERDField): string {
  const baseTypes: Record<PrismaFieldType, string> = {
    String: 'z.string()',
    Int: 'z.number().int()',
    Float: 'z.number()',
    Boolean: 'z.boolean()',
    DateTime: 'z.date()',
    Json: 'z.any()'
  };

  let zodType = baseTypes[prismaType] || 'z.string()';

  // Add string validations
  if (prismaType === 'String') {
    if (field.name.includes('email') || field.name.includes('Email')) {
      zodType = 'z.string().email()';
    } else if (field.name.includes('url') || field.name.includes('Url')) {
      zodType = 'z.string().url()';
    } else {
      zodType = 'z.string().min(1)';
    }
  }

  // Add number validations
  if (prismaType === 'Int' || prismaType === 'Float') {
    if (field.name.includes('age') || field.name.includes('Age')) {
      zodType = 'z.number().int().min(0).max(150)';
    } else if (field.name.includes('price') || field.name.includes('Price') || field.name.includes('amount')) {
      zodType = 'z.number().min(0)';
    } else {
      zodType = 'z.number()';
    }
  }

  return zodType;
}

/**
 * Generate Zod schema for a single field
 */
function generateFieldSchema(field: ERDField): string {
  let zodType = mapToZodType(field.type, field);

  // Make optional if not required
  if (!field.isRequired) {
    zodType += '.optional()';
  }

  return `${field.name}: ${zodType}`;
}

/**
 * Generate Create schema (excludes id, createdAt, updatedAt, FK fields)
 */
function generateCreateSchema(table: ERDTable): string {
  const modelName = table.name;
  const schemaName = `Create${modelName}Schema`;

  // Filter out system fields and FK fields
  const userFields = table.fields.filter(
    f => !f.name.endsWith('Id') && 
         f.name !== 'id' && 
         f.name !== 'createdAt' && 
         f.name !== 'updatedAt'
  );

  const fieldSchemas = userFields.map(generateFieldSchema);

  return `export const ${schemaName} = z.object({
  ${fieldSchemas.join(',\n  ')}
});

export type Create${modelName}Input = z.infer<typeof ${schemaName}>;`;
}

/**
 * Generate Update schema (all fields optional)
 */
function generateUpdateSchema(table: ERDTable): string {
  const modelName = table.name;
  const schemaName = `Update${modelName}Schema`;

  // Filter out system fields
  const userFields = table.fields.filter(
    f => !f.name.endsWith('Id') && 
         f.name !== 'id' && 
         f.name !== 'createdAt' && 
         f.name !== 'updatedAt'
  );

  const fieldSchemas = userFields.map(field => {
    const zodType = mapToZodType(field.type, field);
    return `${field.name}: ${zodType}.optional()`;
  });

  return `export const ${schemaName} = z.object({
  ${fieldSchemas.join(',\n  ')}
});

export type Update${modelName}Input = z.infer<typeof ${schemaName}>;`;
}

/**
 * Generate complete Zod schemas file
 */
export function generateZodSchemas(ast: ValidatedERDAST): string {
  const sections: string[] = [];

  // Add imports
  sections.push(`import { z } from 'zod';

// ============================================
// Generated Zod Validation Schemas
// ============================================
`);

  // Generate schemas for each model
  for (const table of ast.tables) {
    sections.push(`// ${table.name} Schemas`);
    sections.push(generateCreateSchema(table));
    sections.push('');
    sections.push(generateUpdateSchema(table));
    sections.push('');
  }

  // Add usage example
  sections.push(`// ============================================
// Usage Example
// ============================================
//
// import { CreateUserSchema, UpdateUserSchema } from './validation';
//
// // In your API route:
// export async function POST(request: Request) {
//   const body = await request.json();
//   
//   // Validate with Zod
//   const validated = CreateUserSchema.parse(body);
//   
//   // Now use validated data
//   const user = await prisma.user.create({ data: validated });
//   return NextResponse.json(user);
// }
`);

  return sections.join('\n');
}

// Made with Bob
