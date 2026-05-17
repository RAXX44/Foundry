/**
 * Prisma Schema Generator
 * Deterministic code generation from validated ERD AST
 * Does NOT rely on AI formatting
 */

import type { ValidatedERDAST, ERDTable, ERDField, ERDRelation } from '@/types/erd';
import { toCamelCase } from '@/lib/utils/string';

/**
 * Generate datasource block
 */
function generateDatasource(dbType: string = 'postgresql'): string {
  const providers: Record<string, string> = {
    postgresql: 'provider = "postgresql"\n  url      = env("DATABASE_URL")',
    mysql: 'provider = "mysql"\n  url      = env("DATABASE_URL")',
    sqlite: 'provider = "sqlite"\n  url      = "file:./dev.db"'
  };

  const providerConfig = providers[dbType] || providers.postgresql;

  return `datasource db {
  ${providerConfig}
}`;
}

/**
 * Generate generator block
 */
function generateGenerator(): string {
  return `generator client {
  provider = "prisma-client-js"
}`;
}

/**
 * Generate field definition
 */
function generateField(field: ERDField): string {
  const parts: string[] = [field.name, field.type];

  if (field.isArray) {
    parts[1] += '[]';
  }

  if (!field.isRequired) {
    parts[1] += '?';
  }

  const attributes: string[] = [];

  if (field.isUnique) {
    attributes.push('@unique');
  }

  if (field.defaultValue !== undefined) {
    if (typeof field.defaultValue === 'string') {
      attributes.push(`@default("${field.defaultValue}")`);
    } else {
      attributes.push(`@default(${field.defaultValue})`);
    }
  }

  if (attributes.length > 0) {
    parts.push(attributes.join(' '));
  }

  return parts.join(' ');
}

/**
 * Generate relation field for Prisma
 */
function generateRelationField(
  relation: ERDRelation,
  fromModel: string,
  isInverse: boolean
): string {
  if (isInverse) {
    // Inverse side (one-to-many from parent)
    return `${relation.name} ${relation.from}[]`;
  } else {
    // FK side (many-to-one from child)
    const fkField = `${toCamelCase(relation.to)}Id`;
    const relationAttr = `@relation(fields: [${fkField}], references: [id], onDelete: ${relation.onDelete})`;
    return `${relation.name} ${relation.to} ${relationAttr}`;
  }
}

/**
 * Generate complete model with all fields and relations
 */
function generateModel(
  table: ERDTable,
  relations: ERDRelation[]
): string {
  const lines: string[] = [`model ${table.name} {`];

  // Add ID field
  lines.push('  id        Int      @id @default(autoincrement())');

  // Add regular fields
  for (const field of table.fields) {
    lines.push(`  ${generateField(field)}`);
  }

  // Add relation fields
  const modelRelations = relations.filter(
    r => r.from === table.name || r.to === table.name
  );

  for (const rel of modelRelations) {
    if (rel.from === table.name && rel.type === 'many-to-one') {
      // This model has FK to another model
      lines.push(`  ${generateRelationField(rel, table.name, false)}`);
    } else if (rel.to === table.name && rel.type === 'one-to-many') {
      // This model is referenced by another model
      lines.push(`  ${generateRelationField(rel, table.name, true)}`);
    } else if (rel.from === table.name && rel.type === 'one-to-one') {
      // One-to-one relation
      const fkField = `${toCamelCase(rel.to)}Id`;
      const relationAttr = `@relation(fields: [${fkField}], references: [id], onDelete: ${rel.onDelete})`;
      lines.push(`  ${fkField}   Int      @unique`);
      lines.push(`  ${rel.name} ${rel.to} ${relationAttr}`);
    }
  }

  // Add timestamps
  lines.push('  createdAt DateTime @default(now())');
  lines.push('  updatedAt DateTime @updatedAt');

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate complete Prisma schema from validated AST
 */
export function generatePrismaSchema(
  ast: ValidatedERDAST,
  dbType: string = 'postgresql'
): string {
  const sections: string[] = [];

  // Add datasource
  sections.push(generateDatasource(dbType));
  sections.push('');

  // Add generator
  sections.push(generateGenerator());
  sections.push('');

  // Add models
  for (const table of ast.tables) {
    sections.push(generateModel(table, ast.relations));
    sections.push('');
  }

  return sections.join('\n').trim();
}

/**
 * Example: Generate schema from example AST
 */
export function generateExampleSchema(): string {
  const exampleAST: ValidatedERDAST = {
    tables: [
      {
        name: 'User',
        fields: [
          { name: 'name', type: 'String', isRequired: true, isUnique: false, isArray: false },
          { name: 'email', type: 'String', isRequired: true, isUnique: true, isArray: false }
        ]
      },
      {
        name: 'Post',
        fields: [
          { name: 'title', type: 'String', isRequired: true, isUnique: false, isArray: false },
          { name: 'content', type: 'String', isRequired: true, isUnique: false, isArray: false },
          { name: 'userId', type: 'Int', isRequired: true, isUnique: false, isArray: false }
        ]
      }
    ],
    relations: [
      {
        name: 'posts',
        from: 'User',
        to: 'Post',
        type: 'one-to-many',
        onDelete: 'Cascade'
      },
      {
        name: 'user',
        from: 'Post',
        to: 'User',
        type: 'many-to-one',
        onDelete: 'Cascade'
      }
    ],
    validated: true,
    timestamp: new Date().toISOString()
  };

  return generatePrismaSchema(exampleAST);
}

// Made with Bob
