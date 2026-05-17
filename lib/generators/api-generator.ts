/**
 * API Routes Generator
 * Generates Next.js 14 App Router API routes with CRUD operations
 */

import type { ValidatedERDAST, ERDTable } from '@/types/erd';
import { toCamelCase } from '@/lib/utils/string';

/**
 * Generate CRUD routes for a single model
 */
function generateModelRoutes(table: ERDTable): string {
  const modelName = table.name;
  const modelLower = modelName.toLowerCase();
  const modelVar = toCamelCase(modelName);
  const modelVarPlural = `${modelVar}s`;

  return `// ============================================
// ${modelName} API Routes
// ============================================

// GET /api/${modelLower} - Get all ${modelName}
export async function GET_${modelName.toUpperCase()}() {
  try {
    const ${modelVarPlural} = await prisma.${modelVar}.findMany({
      include: {
        // Add relations here if needed
      }
    });
    return NextResponse.json(${modelVarPlural});
  } catch (error) {
    console.error('Error fetching ${modelVarPlural}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ${modelVarPlural}' },
      { status: 500 }
    );
  }
}

// GET /api/${modelLower}/[id] - Get ${modelName} by ID
export async function GET_${modelName.toUpperCase()}_BY_ID(id: string) {
  try {
    const ${modelVar} = await prisma.${modelVar}.findUnique({
      where: { id: parseInt(id) },
      include: {
        // Add relations here if needed
      }
    });
    
    if (!${modelVar}) {
      return NextResponse.json(
        { error: '${modelName} not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(${modelVar});
  } catch (error) {
    console.error('Error fetching ${modelVar}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ${modelVar}' },
      { status: 500 }
    );
  }
}

// POST /api/${modelLower} - Create ${modelName}
export async function POST_${modelName.toUpperCase()}(request: Request) {
  try {
    const body = await request.json();
    
    const ${modelVar} = await prisma.${modelVar}.create({
      data: body
    });
    
    return NextResponse.json(${modelVar}, { status: 201 });
  } catch (error) {
    console.error('Error creating ${modelVar}:', error);
    return NextResponse.json(
      { error: 'Failed to create ${modelVar}' },
      { status: 500 }
    );
  }
}

// PUT /api/${modelLower}/[id] - Update ${modelName}
export async function PUT_${modelName.toUpperCase()}(request: Request, id: string) {
  try {
    const body = await request.json();
    
    const ${modelVar} = await prisma.${modelVar}.update({
      where: { id: parseInt(id) },
      data: body
    });
    
    return NextResponse.json(${modelVar});
  } catch (error) {
    console.error('Error updating ${modelVar}:', error);
    return NextResponse.json(
      { error: 'Failed to update ${modelVar}' },
      { status: 500 }
    );
  }
}

// DELETE /api/${modelLower}/[id] - Delete ${modelName}
export async function DELETE_${modelName.toUpperCase()}(id: string) {
  try {
    await prisma.${modelVar}.delete({
      where: { id: parseInt(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ${modelVar}:', error);
    return NextResponse.json(
      { error: 'Failed to delete ${modelVar}' },
      { status: 500 }
    );
  }
}`;
}

/**
 * Generate complete API routes file
 */
export function generateApiRoutes(ast: ValidatedERDAST): string {
  const sections: string[] = [];

  // Add imports
  sections.push(`import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
`);

  // Generate routes for each model
  for (const table of ast.tables) {
    sections.push(generateModelRoutes(table));
    sections.push('');
  }

  // Add export note
  sections.push(`// ============================================
// Usage Instructions
// ============================================
// 
// To use these routes, create the following files:
// 
// 1. app/api/[model]/route.ts
//    Export: GET, POST
// 
// 2. app/api/[model]/[id]/route.ts
//    Export: GET, PUT, DELETE
//
// Example for User model:
// 
// File: app/api/user/route.ts
// export { GET_USER as GET, POST_USER as POST } from '@/lib/generated/routes';
//
// File: app/api/user/[id]/route.ts
// export async function GET(req: Request, { params }: { params: { id: string } }) {
//   return GET_USER_BY_ID(params.id);
// }
// export async function PUT(req: Request, { params }: { params: { id: string } }) {
//   return PUT_USER(req, params.id);
// }
// export async function DELETE(req: Request, { params }: { params: { id: string } }) {
//   return DELETE_USER(params.id);
// }
`);

  return sections.join('\n');
}

/**
 * Generate simplified routes (alternative format)
 */
export function generateSimplifiedRoutes(ast: ValidatedERDAST): string {
  const sections: string[] = [];

  sections.push(`import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Generated CRUD Routes
// ============================================
`);

  for (const table of ast.tables) {
    const modelName = table.name;
    const modelVar = toCamelCase(modelName);

    sections.push(`
// ${modelName} Routes
export const ${modelVar}Routes = {
  getAll: async () => {
    const items = await prisma.${modelVar}.findMany();
    return NextResponse.json(items);
  },
  
  getById: async (id: number) => {
    const item = await prisma.${modelVar}.findUnique({ where: { id } });
    return item ? NextResponse.json(item) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  },
  
  create: async (data: any) => {
    const item = await prisma.${modelVar}.create({ data });
    return NextResponse.json(item, { status: 201 });
  },
  
  update: async (id: number, data: any) => {
    const item = await prisma.${modelVar}.update({ where: { id }, data });
    return NextResponse.json(item);
  },
  
  delete: async (id: number) => {
    await prisma.${modelVar}.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }
};`);
  }

  return sections.join('\n');
}

// Made with Bob
