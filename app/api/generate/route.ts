import { NextRequest, NextResponse } from 'next/server';
import { processERDImage, validatePipelineConfig } from '@/lib/pipeline/orchestrator';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Validate pipeline configuration
    const configCheck = validatePipelineConfig();
    if (!configCheck.valid) {
      return NextResponse.json(
        { 
          error: 'Pipeline configuration error',
          details: configCheck.errors 
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const dbType = (formData.get('dbType') as string) || 'postgresql';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are supported.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process ERD through the production pipeline
    console.log('🚀 Processing ERD image through pipeline...');
    const result = await processERDImage(buffer, dbType);

    return NextResponse.json({
      success: true,
      ...result,
      dbType,
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate code' },
      { status: 500 }
    );
  }
}

// Made with Bob - Production-grade ERD pipeline