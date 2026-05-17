import type {
  ValidatedERDAST,
  ERDTable,
  ERDRelation
} from '@/types/erd';

/**
 * Sanitize entity/field names for Mermaid compatibility
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .toUpperCase();
}

/**
 * Sanitize relation labels
 * Remove special characters except spaces, then escape any remaining quotes
 */
function sanitizeLabel(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9_ ]/g, '')
    .replace(/"/g, '')  // Remove any quotes to prevent breaking wrapped quotes
    .trim();
}

/**
 * Prisma -> Mermaid type mapping
 */
function mapToMermaidType(
  prismaType: string
): string {

  const typeMap: Record<string, string> = {
    String: 'string',
    Int: 'int',
    Float: 'float',
    Boolean: 'boolean',
    DateTime: 'datetime',
    Json: 'json',
    Decimal: 'decimal',
    BigInt: 'bigint',
    Bytes: 'bytes',
  };

  return typeMap[prismaType] || 'string';
}

/**
 * Relation cardinality mapping
 */
function mapRelationToCardinality(
  relationType: string
): string {

  switch (relationType) {

    case 'one-to-one':
      return '||--||';

    case 'one-to-many':
      return '||--o{';

    case 'many-to-one':
      return '}o--||';

    case 'many-to-many':
      return '}o--o{';

    default:
      return '||--o{';
  }
}

/**
 * Generate Mermaid entity block
 */
function generateEntity(
  table: ERDTable
): string {

  const lines: string[] = [];

  const tableName =
    sanitizeName(table.name);

  lines.push(`${tableName} {`);

  const processedFields =
    new Set<string>();

  const hasId =
    table.fields.some(
      (f) =>
        f.name.toLowerCase() === 'id'
    );

  const hasCreatedAt =
    table.fields.some(
      (f) =>
        f.name === 'createdAt'
    );

  const hasUpdatedAt =
    table.fields.some(
      (f) =>
        f.name === 'updatedAt'
    );

  /**
   * Auto ID
   */
  if (!hasId) {
    lines.push(`  int ID PK`);
  }

  /**
   * Fields
   */
  for (const field of table.fields) {

    if (
      processedFields.has(field.name)
    ) {
      continue;
    }

    processedFields.add(
      field.name
    );

    const type =
      mapToMermaidType(field.type);

    const fieldName =
      sanitizeName(field.name);

    const suffixes: string[] = [];

    /**
     * Primary Key
     */
    if (
      field.name.toLowerCase() === 'id'
    ) {
      suffixes.push('PK');
    }

    /**
     * Foreign Key
     */
    if (
      field.name.endsWith('Id') &&
      field.name.toLowerCase() !== 'id'
    ) {
      suffixes.push('FK');
    }

    /**
     * Unique Key
     */
    if (field.isUnique) {
      suffixes.push('UK');
    }

    /**
     * Mermaid ERD supports:
     * PK, FK, UK only
     */
    const suffix =
      suffixes.length > 0
        ? ` ${suffixes.join(' ')}`
        : '';

    lines.push(
      `  ${type} ${fieldName}${suffix}`
    );
  }

  /**
   * Auto timestamps
   */
  if (!hasCreatedAt) {
    lines.push(
      `  datetime CREATED_AT`
    );
  }

  if (!hasUpdatedAt) {
    lines.push(
      `  datetime UPDATED_AT`
    );
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate Mermaid relationship line
 * Labels are wrapped in double quotes to handle spaces correctly
 */
function generateRelationship(
  relation: ERDRelation
): string {

  const cardinality =
    mapRelationToCardinality(
      relation.type
    );

  const label =
    relation.name &&
    relation.name.trim().length > 0
      ? sanitizeLabel(relation.name)
      : 'relation';

  return `${sanitizeName(
    relation.from
  )} ${cardinality} ${sanitizeName(
    relation.to
  )} : "${label}"`;
}

/**
 * Main Mermaid generator
 */
export function generateMermaidDiagram(
  ast: ValidatedERDAST
): string {

  const lines: string[] = [];

  /**
   * Mermaid ERD header
   */
  lines.push('erDiagram');

  const processedRelations =
    new Set<string>();

  /**
   * Generate relationships
   */
  for (const relation of ast.relations) {

    /**
     * Skip invalid self relations
     */
    if (
      relation.from === relation.to
    ) {
      continue;
    }

    /**
     * Allowed relation types
     */
    if (
      relation.type !== 'one-to-many' &&
      relation.type !== 'one-to-one' &&
      relation.type !== 'many-to-one' &&
      relation.type !== 'many-to-many'
    ) {
      continue;
    }

    /**
     * Prevent duplicates
     */
    const normalizedTables = [
      relation.from,
      relation.to,
    ]
      .map(sanitizeName)
      .sort()
      .join('-');

    const relationKey = [
      normalizedTables,
      relation.type,
      relation.name,
    ].join('-');

    if (
      processedRelations.has(
        relationKey
      )
    ) {
      continue;
    }

    processedRelations.add(
      relationKey
    );

    lines.push(
      generateRelationship(
        relation
      )
    );
  }

  lines.push('');

  /**
   * Generate entities
   */
  for (const table of ast.tables) {

    lines.push(
      generateEntity(table)
    );

    lines.push('');
  }

  return lines
    .join('\n')
    .trim();
}