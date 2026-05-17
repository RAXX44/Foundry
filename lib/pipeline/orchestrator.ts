/**
 * ERD Pipeline Orchestrator
 * Main entry point that coordinates the entire pipeline
 */

import type { GeneratedCode } from '@/types/erd';
import { extractERDStructure } from '@/lib/ai/extractor';
import { buildERDAST } from '@/lib/parser/ast-builder';
import { validateERDAST } from '@/lib/validators/erd-validator';
import { generatePrismaSchema } from '@/lib/generators/prisma-generator';
import { generateApiRoutes } from '@/lib/generators/api-generator';
import { generateZodSchemas } from '@/lib/generators/zod-generator';
import { generateSeedScript } from '@/lib/generators/seed-generator';
import { generateMermaidDiagram } from '@/lib/generators/mermaid-generator';

/**
 * Main pipeline function
 * Orchestrates the entire ERD extraction and code generation process
 * 
 * Pipeline stages:
 * 1. AI Extraction - Extract structured JSON from image
 * 2. AST Building - Convert to strongly-typed AST
 * 3. Validation - Normalize and validate AST
 * 4. Code Generation - Generate all code deterministically
 */
export async function processERDImage(
  imageBuffer: Buffer,
  dbType: string = 'postgresql'
): Promise<GeneratedCode> {
  try {
    console.log('🚀 Starting ERD pipeline...');
    
    // Stage 1: AI Extraction
    console.log('📸 Stage 1: Extracting structure from image...');
    const aiResult = await extractERDStructure(imageBuffer);
    console.log(`✅ Extracted ${aiResult.tables.length} tables and ${aiResult.relations.length} relations`);
    
    // Stage 2: AST Building
    console.log('🏗️  Stage 2: Building typed AST...');
    const ast = buildERDAST(aiResult);
    console.log(`✅ Built AST with ${ast.tables.length} tables`);
    
    // Stage 3: Validation
    console.log('✔️  Stage 3: Validating and normalizing...');
    const validatedAST = validateERDAST(ast);
    console.log(`✅ Validated AST with ${validatedAST.tables.length} tables and ${validatedAST.relations.length} relations`);
    
    // Stage 4: Code Generation
    console.log('⚙️  Stage 4: Generating code...');
    
    const prismaSchema = generatePrismaSchema(validatedAST, dbType);
    console.log('  ✓ Generated Prisma schema');
    
    const apiRoutes = generateApiRoutes(validatedAST);
    console.log('  ✓ Generated API routes');
    
    const zodSchemas = generateZodSchemas(validatedAST);
    console.log('  ✓ Generated Zod schemas');
    
    const seedScript = generateSeedScript(validatedAST);
    console.log('  ✓ Generated seed script');
    
    const mermaidDiagram = generateMermaidDiagram(validatedAST);
    console.log('  ✓ Generated Mermaid diagram');
    
    console.log('✅ Pipeline completed successfully!');
    
    return {
      prismaSchema,
      apiRoutes,
      zodSchemas,
      seedScript,
      mermaidDiagram
    };
    
  } catch (error) {
    console.error('❌ Pipeline error:', error);
    throw new Error(
      `ERD pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate pipeline configuration
 */
export function validatePipelineConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.WATSONX_API_KEY) {
    errors.push('WATSONX_API_KEY is not configured');
  }
  
  if (!process.env.WATSONX_PROJECT_ID) {
    errors.push('WATSONX_PROJECT_ID is not configured');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get pipeline statistics
 */
export interface PipelineStats {
  totalTables: number;
  totalRelations: number;
  totalFields: number;
  generatedFiles: number;
  processingTime: number;
}

export async function getPipelineStats(
  imageBuffer: Buffer,
  dbType: string = 'postgresql'
): Promise<PipelineStats> {
  const startTime = Date.now();
  
  const result = await processERDImage(imageBuffer, dbType);
  
  const endTime = Date.now();
  const processingTime = endTime - startTime;
  
  // Parse schema to count tables and fields
  const tableMatches = result.prismaSchema.match(/model\s+\w+\s*\{/g) || [];
  const fieldMatches = result.prismaSchema.match(/^\s+\w+\s+\w+/gm) || [];
  const relationMatches = result.prismaSchema.match(/@relation/g) || [];
  
  return {
    totalTables: tableMatches.length,
    totalRelations: relationMatches.length,
    totalFields: fieldMatches.length,
    generatedFiles: 5, // prisma, api, zod, seed, mermaid
    processingTime
  };
}

// Made with Bob
