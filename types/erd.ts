/**
 * Core ERD Type Definitions
 * Strongly typed interfaces for the ERD AST pipeline
 */

export type PrismaFieldType = 
  | 'String' 
  | 'Int' 
  | 'Float' 
  | 'Boolean' 
  | 'DateTime' 
  | 'Json';

export type RelationType = 
  | 'one-to-one' 
  | 'one-to-many' 
  | 'many-to-one' 
  | 'many-to-many';

export interface ERDField {
  name: string;
  type: PrismaFieldType;
  isRequired: boolean;
  isUnique: boolean;
  isArray: boolean;
  defaultValue?: string | number | boolean;
}

export interface ERDRelation {
  name: string;
  from: string;
  to: string;
  type: RelationType;
  fromField?: string;
  toField?: string;
  onDelete?: 'Cascade' | 'SetNull' | 'Restrict';
}

export interface ERDTable {
  name: string;
  fields: ERDField[];
}

export interface ERDAST {
  tables: ERDTable[];
  relations: ERDRelation[];
}

export interface ValidatedERDAST extends ERDAST {
  validated: true;
  timestamp: string;
}

export interface AIExtractionResult {
  tables: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      required?: boolean;
      unique?: boolean;
    }>;
  }>;
  relations: Array<{
    from: string;
    to: string;
    type: string;
    name?: string;
  }>;
}

export interface GeneratedCode {
  prismaSchema: string;
  apiRoutes: string;
  zodSchemas: string;
  seedScript: string;
  mermaidDiagram: string;
}

// Made with Bob
