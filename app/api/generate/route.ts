import { NextRequest, NextResponse } from 'next/server';
import { analyzeERD } from '@/lib/watsonx';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const dbType = formData.get('dbType') as string || 'postgresql';

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are supported.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Analyze ERD using watsonx.ai
    const result = await analyzeERD(buffer, dbType);

    return NextResponse.json({
      success: true,
      prismaSchema: result.prismaSchema,
      apiRoutes: result.apiRoutes,
      mermaidDiagram: result.mermaidDiagram,
    });

  } catch (error) {
    console.error('Generation error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate code',
      },
      { status: 500 }
    );
  }
}

// Made with Bob
