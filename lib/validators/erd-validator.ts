/**
 * ERD Validator
 * Validates and normalizes ERD AST
 * - Removes self-relations
 * - Removes duplicate models
 * - Normalizes names
 * - Infers missing inverse relations
 * - Validates FK consistency
 */

import type { ERDAST, ValidatedERDAST, ERDTable, ERDRelation } from '@/types/erd';
import { normalizeModelName, normalizeFieldName, toCamelCase } from '@/lib/utils/string';

/**
 * Remove duplicate tables (by name)
 */
function deduplicateTables(tables: ERDTable[]): ERDTable[] {
  const seen = new Set<string>();
  return tables.filter(table => {
    if (seen.has(table.name)) {
      return false;
    }
    seen.add(table.name);
    return true;
  });
}

/**
 * Remove self-relations (table relating to itself)
 */
function removeSelfRelations(relations: ERDRelation[]): ERDRelation[] {
  return relations.filter(rel => rel.from !== rel.to);
}

/**
 * Remove duplicate relations
 */
function deduplicateRelations(relations: ERDRelation[]): ERDRelation[] {
  const seen = new Set<string>();
  return relations.filter(rel => {
    const key = `${rel.from}-${rel.to}-${rel.type}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Infer inverse relations for bidirectional Prisma relations
 * For each relation, ensure both sides are represented
 */
function inferInverseRelations(relations: ERDRelation[], tables: ERDTable[]): ERDRelation[] {
  const tableNames = new Set(tables.map(t => t.name));
  const enhanced: ERDRelation[] = [...relations];
  
  for (const rel of relations) {
    // Skip if either table doesn't exist
    if (!tableNames.has(rel.from) || !tableNames.has(rel.to)) {
      continue;
    }
    
    // For one-to-many, ensure we have the inverse many-to-one
    if (rel.type === 'one-to-many') {
      const inverseExists = enhanced.some(
        r => r.from === rel.to && r.to === rel.from && r.type === 'many-to-one'
      );
      
      if (!inverseExists) {
        enhanced.push({
          name: toCamelCase(rel.from.toLowerCase()),
          from: rel.to,
          to: rel.from,
          type: 'many-to-one',
          onDelete: rel.onDelete
        });
      }
    }
    
    // For many-to-one, ensure we have the inverse one-to-many
    if (rel.type === 'many-to-one') {
      const inverseExists = enhanced.some(
        r => r.from === rel.to && r.to === rel.from && r.type === 'one-to-many'
      );
      
      if (!inverseExists) {
        enhanced.push({
          name: toCamelCase(rel.to.toLowerCase()) + 's',
          from: rel.to,
          to: rel.from,
          type: 'one-to-many',
          onDelete: rel.onDelete
        });
      }
    }
  }
  
  return enhanced;
}

/**
 * Validate that all relations reference existing tables
 */
function validateRelationReferences(relations: ERDRelation[], tables: ERDTable[]): ERDRelation[] {
  const tableNames = new Set(tables.map(t => t.name));
  
  return relations.filter(rel => {
    const fromExists = tableNames.has(rel.from);
    const toExists = tableNames.has(rel.to);
    
    if (!fromExists) {
      console.warn(`Relation references non-existent table: ${rel.from}`);
    }
    if (!toExists) {
      console.warn(`Relation references non-existent table: ${rel.to}`);
    }
    
    return fromExists && toExists;
  });
}

/**
 * Ensure all table and field names are properly normalized
 */
function normalizeNames(ast: ERDAST): ERDAST {
  return {
    tables: ast.tables.map(table => ({
      ...table,
      name: normalizeModelName(table.name),
      fields: table.fields.map(field => ({
        ...field,
        name: normalizeFieldName(field.name)
      }))
    })),
    relations: ast.relations.map(rel => ({
      ...rel,
      from: normalizeModelName(rel.from),
      to: normalizeModelName(rel.to),
      name: normalizeFieldName(rel.name)
    }))
  };
}

/**
 * Add foreign key fields for relations
 * For many-to-one relations, add the FK field to the "from" table
 */
function addForeignKeyFields(ast: ERDAST): ERDAST {
  const tables = [...ast.tables];
  
  for (const rel of ast.relations) {
    if (rel.type === 'many-to-one') {
      const fromTable = tables.find(t => t.name === rel.from);
      if (fromTable) {
        const fkFieldName = `${toCamelCase(rel.to)}Id`;
        
        // Check if FK field already exists
        const fkExists = fromTable.fields.some(f => f.name === fkFieldName);
        
        if (!fkExists) {
          fromTable.fields.push({
            name: fkFieldName,
            type: 'Int',
            isRequired: true,
            isUnique: false,
            isArray: false
          });
        }
      }
    }
  }
  
  return {
    ...ast,
    tables
  };
}

/**
 * Main validation function
 * Applies all validation and normalization rules
 */
export function validateERDAST(ast: ERDAST): ValidatedERDAST {
  // Step 1: Normalize all names
  let validated = normalizeNames(ast);
  
  // Step 2: Remove duplicates
  validated.tables = deduplicateTables(validated.tables);
  validated.relations = deduplicateRelations(validated.relations);
  
  // Step 3: Remove self-relations
  validated.relations = removeSelfRelations(validated.relations);
  
  // Step 4: Validate relation references
  validated.relations = validateRelationReferences(validated.relations, validated.tables);
  
  // Step 5: Infer inverse relations
  validated.relations = inferInverseRelations(validated.relations, validated.tables);
  
  // Step 6: Add foreign key fields
  validated = addForeignKeyFields(validated);
  
  // Step 7: Deduplicate again after adding inverse relations
  validated.relations = deduplicateRelations(validated.relations);
  
  return {
    ...validated,
    validated: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate that AST has required structure
 */
export function isValidAST(ast: any): ast is ERDAST {
  return (
    ast &&
    typeof ast === 'object' &&
    Array.isArray(ast.tables) &&
    Array.isArray(ast.relations) &&
    ast.tables.every((t: any) => 
      t.name && 
      typeof t.name === 'string' &&
      Array.isArray(t.fields)
    )
  );
}

// Made with Bob
