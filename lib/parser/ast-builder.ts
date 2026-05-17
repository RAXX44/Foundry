/**
 * AST Builder
 * Converts AI extraction result to strongly-typed ERD AST
 */

import type { AIExtractionResult, ERDAST, ERDTable, ERDField, ERDRelation, PrismaFieldType, RelationType } from '@/types/erd';
import { normalizeModelName, normalizeFieldName } from '@/lib/utils/string';

/**
 * Map AI field type to Prisma field type
 */
function mapFieldType(aiType: string): PrismaFieldType {
  const normalized = aiType.toLowerCase();
  
  if (normalized.includes('string') || normalized.includes('text') || normalized.includes('varchar')) {
    return 'String';
  }
  if (normalized.includes('number') || normalized.includes('int') || normalized.includes('integer')) {
    return 'Int';
  }
  if (normalized.includes('float') || normalized.includes('decimal') || normalized.includes('double')) {
    return 'Float';
  }
  if (normalized.includes('bool')) {
    return 'Boolean';
  }
  if (normalized.includes('date') || normalized.includes('time')) {
    return 'DateTime';
  }
  
  // Default to String for unknown types
  return 'String';
}

/**
 * Map AI relation type to typed RelationType
 */
function mapRelationType(aiType: string): RelationType {
  const normalized = aiType.toLowerCase().replace(/[_\s-]/g, '');
  
  if (normalized.includes('onetoone') || normalized === '11') {
    return 'one-to-one';
  }
  if (normalized.includes('onetomany') || normalized === '1n' || normalized === '1m') {
    return 'one-to-many';
  }
  if (normalized.includes('manytoone') || normalized === 'n1' || normalized === 'm1') {
    return 'many-to-one';
  }
  if (normalized.includes('manytomany') || normalized === 'nm' || normalized === 'mn') {
    return 'many-to-many';
  }
  
  // Default to one-to-many
  return 'one-to-many';
}

/**
 * Build ERD field from AI field data
 */
function buildField(aiField: any): ERDField {
  return {
    name: normalizeFieldName(aiField.name),
    type: mapFieldType(aiField.type),
    isRequired: aiField.required !== false, // Default to true
    isUnique: aiField.unique === true, // Default to false
    isArray: false,
    defaultValue: aiField.default
  };
}

/**
 * Build ERD table from AI table data
 */
function buildTable(aiTable: any): ERDTable {
  const normalizedName = normalizeModelName(aiTable.name);
  
  const fields: ERDField[] = (aiTable.fields || []).map(buildField);
  
  return {
    name: normalizedName,
    fields
  };
}

/**
 * Build ERD relation from AI relation data
 */
function buildRelation(aiRelation: any): ERDRelation {
  const fromModel = normalizeModelName(aiRelation.from);
  const toModel = normalizeModelName(aiRelation.to);
  const relationType = mapRelationType(aiRelation.type);
  
  // Generate relation name if not provided
  const relationName = aiRelation.name 
    ? normalizeFieldName(aiRelation.name)
    : normalizeFieldName(toModel.toLowerCase());
  
  return {
    name: relationName,
    from: fromModel,
    to: toModel,
    type: relationType,
    fromField: aiRelation.fromField,
    toField: aiRelation.toField,
    onDelete: aiRelation.onDelete || 'Cascade'
  };
}

/**
 * Build complete ERD AST from AI extraction result
 */
export function buildERDAST(aiResult: AIExtractionResult): ERDAST {
  // Build tables
  const tables: ERDTable[] = aiResult.tables.map(buildTable);
  
  // Build relations
  const relations: ERDRelation[] = (aiResult.relations || []).map(buildRelation);
  
  return {
    tables,
    relations
  };
}

/**
 * Example usage and type demonstration
 */
export const exampleAST: ERDAST = {
  tables: [
    {
      name: 'User',
      fields: [
        { name: 'name', type: 'String', isRequired: true, isUnique: false, isArray: false },
        { name: 'email', type: 'String', isRequired: true, isUnique: true, isArray: false },
        { name: 'age', type: 'Int', isRequired: false, isUnique: false, isArray: false }
      ]
    },
    {
      name: 'Post',
      fields: [
        { name: 'title', type: 'String', isRequired: true, isUnique: false, isArray: false },
        { name: 'content', type: 'String', isRequired: true, isUnique: false, isArray: false },
        { name: 'published', type: 'Boolean', isRequired: true, isUnique: false, isArray: false }
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
    }
  ]
};

// Made with Bob
