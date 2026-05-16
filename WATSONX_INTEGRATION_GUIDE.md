# watsonx.ai Integration Guide for Foundry

## Overview

This guide provides detailed instructions for integrating IBM watsonx.ai's vision capabilities into the Foundry application to analyze ERD diagrams.

## Prerequisites

1. IBM Cloud account
2. watsonx.ai service instance
3. API credentials (API key and Project ID)

## Setup Steps

### 1. Create watsonx.ai Service Instance

1. Log in to [IBM Cloud](https://cloud.ibm.com)
2. Navigate to the Catalog
3. Search for "watsonx.ai"
4. Create a new service instance
5. Note your API key and service URL

### 2. Get Project ID

1. Go to watsonx.ai platform
2. Create or select a project
3. Copy the Project ID from project settings

### 3. Install Required Packages

```bash
npm install @ibm-cloud/watsonx-ai
npm install ibm-cloud-sdk-core
npm install form-data
```

## Implementation

### Client Configuration

```typescript
// lib/watsonx/client.ts
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import { IamAuthenticator } from 'ibm-cloud-sdk-core';

export class WatsonXClient {
  private client: WatsonXAI;
  private projectId: string;

  constructor() {
    const authenticator = new IamAuthenticator({
      apikey: process.env.WATSONX_API_KEY!,
    });

    this.client = new WatsonXAI({
      version: '2024-05-31',
      authenticator,
      serviceUrl: process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com',
    });

    this.projectId = process.env.WATSONX_PROJECT_ID!;
  }

  /**
   * Analyze an ERD image using watsonx.ai vision model
   */
  async analyzeERDImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Convert image to base64
      const base64Image = imageBuffer.toString('base64');
      const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

      // Prepare the prompt for ERD analysis
      const prompt = this.buildERDAnalysisPrompt();

      // Call the vision model
      const response = await this.client.generateText({
        projectId: this.projectId,
        modelId: 'meta-llama/llama-3-2-90b-vision-instruct', // Vision-capable model
        input: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.1, // Low temperature for consistent output
          top_p: 0.9,
        },
        moderations: {
          hap: {
            input: true,
            output: true,
            threshold: 0.5,
          },
        },
        // Include image in the request
        attachments: [
          {
            type: 'image',
            data: imageDataUrl,
          },
        ],
      });

      return response.result.generated_text;
    } catch (error) {
      console.error('watsonx.ai API Error:', error);
      throw new Error(`Failed to analyze ERD image: ${error.message}`);
    }
  }

  /**
   * Build the prompt for ERD analysis
   */
  private buildERDAnalysisPrompt(): string {
    return `You are an expert database architect analyzing an Entity Relationship Diagram (ERD).

Carefully examine the provided ERD image and extract the following information:

1. **Entities (Tables)**: Identify all entities/tables in the diagram
2. **Fields/Attributes**: For each entity, list all fields with:
   - Field name
   - Data type (map to Prisma types: String, Int, Float, Boolean, DateTime, Json)
   - Constraints (primary key, unique, required/optional)
   - Default values if shown
3. **Relationships**: Identify all relationships between entities:
   - Source entity name
   - Target entity name
   - Relationship type (one-to-one, one-to-many, many-to-many)
   - Foreign key field names
   - Cascade behavior if indicated

**Important Guidelines:**
- Use exact entity and field names from the diagram
- Infer data types based on field names and context (e.g., "email" → String, "age" → Int, "createdAt" → DateTime)
- Assume fields are required unless marked as optional
- For primary keys, use "id" if not explicitly shown
- Use camelCase for field names in relationships

**Output Format:**
Return ONLY a valid JSON object with this exact structure (no additional text):

\`\`\`json
{
  "entities": [
    {
      "name": "EntityName",
      "fields": [
        {
          "name": "id",
          "type": "Int",
          "primaryKey": true,
          "required": true,
          "unique": true
        },
        {
          "name": "fieldName",
          "type": "String",
          "required": true,
          "unique": false,
          "defaultValue": null
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "EntityA",
      "to": "EntityB",
      "type": "one-to-many",
      "fromField": "entityBs",
      "toField": "entityA",
      "onDelete": "Cascade"
    }
  ]
}
\`\`\`

Now analyze the ERD image and provide the JSON output:`;
  }

  /**
   * Test connection to watsonx.ai
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.listModels({
        projectId: this.projectId,
      });
      return response.result.resources.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const watsonxClient = new WatsonXClient();
```

### Vision Service Wrapper

```typescript
// lib/watsonx/vision.ts
import { watsonxClient } from './client';
import { ERDSchema } from '@/types/schema';

export class VisionService {
  /**
   * Analyze ERD image and return structured schema
   */
  async analyzeERD(imageBuffer: Buffer, mimeType: string): Promise<ERDSchema> {
    // Call watsonx.ai vision model
    const rawResponse = await watsonxClient.analyzeERDImage(imageBuffer, mimeType);

    // Parse the JSON response
    const parsedSchema = this.parseVisionResponse(rawResponse);

    // Validate the schema structure
    this.validateSchema(parsedSchema);

    return parsedSchema;
  }

  /**
   * Parse the AI response into structured schema
   */
  private parseVisionResponse(response: string): ERDSchema {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      // Transform to internal schema format
      return {
        entities: parsed.entities.map((entity: any) => ({
          id: this.generateId(),
          name: entity.name,
          fields: entity.fields.map((field: any) => ({
            id: this.generateId(),
            name: field.name,
            type: field.type,
            required: field.required ?? true,
            unique: field.unique ?? false,
            primaryKey: field.primaryKey ?? false,
            defaultValue: field.defaultValue,
          })),
        })),
        relationships: parsed.relationships.map((rel: any) => ({
          id: this.generateId(),
          from: rel.from,
          to: rel.to,
          type: rel.type,
          fromField: rel.fromField,
          toField: rel.toField,
          onDelete: rel.onDelete || 'Cascade',
        })),
      };
    } catch (error) {
      console.error('Failed to parse vision response:', error);
      throw new Error('Invalid response format from AI model');
    }
  }

  /**
   * Validate schema structure
   */
  private validateSchema(schema: ERDSchema): void {
    if (!schema.entities || schema.entities.length === 0) {
      throw new Error('No entities found in ERD');
    }

    // Validate each entity has at least one field
    for (const entity of schema.entities) {
      if (!entity.fields || entity.fields.length === 0) {
        throw new Error(`Entity ${entity.name} has no fields`);
      }

      // Ensure at least one primary key
      const hasPrimaryKey = entity.fields.some(f => f.primaryKey);
      if (!hasPrimaryKey) {
        // Auto-add id field if no primary key
        entity.fields.unshift({
          id: this.generateId(),
          name: 'id',
          type: 'Int',
          required: true,
          unique: true,
          primaryKey: true,
        });
      }
    }

    // Validate relationships reference existing entities
    const entityNames = new Set(schema.entities.map(e => e.name));
    for (const rel of schema.relationships) {
      if (!entityNames.has(rel.from)) {
        throw new Error(`Relationship references unknown entity: ${rel.from}`);
      }
      if (!entityNames.has(rel.to)) {
        throw new Error(`Relationship references unknown entity: ${rel.to}`);
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const visionService = new VisionService();
```

### API Route Implementation

```typescript
// app/api/analyze-erd/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { visionService } from '@/lib/watsonx/vision';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PNG and JPEG are supported.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Analyze with watsonx.ai
    const schema = await visionService.analyzeERD(buffer, file.type);

    return NextResponse.json({
      success: true,
      data: schema,
    });

  } catch (error) {
    console.error('ERD analysis error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze ERD',
      },
      { status: 500 }
    );
  }
}
```

## Alternative: Using REST API Directly

If the SDK doesn't work as expected, you can use the REST API directly:

```typescript
// lib/watsonx/rest-client.ts
export class WatsonXRestClient {
  private apiKey: string;
  private projectId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.WATSONX_API_KEY!;
    this.projectId = process.env.WATSONX_PROJECT_ID!;
    this.baseUrl = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
  }

  async getAccessToken(): Promise<string> {
    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: this.apiKey,
      }),
    });

    const data = await response.json();
    return data.access_token;
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/ml/v1/text/generation?version=2024-05-31`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        project_id: this.projectId,
        model_id: 'meta-llama/llama-3-2-90b-vision-instruct',
        input: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.1,
        },
        attachments: [
          {
            type: 'image',
            data: `data:image/png;base64,${imageBase64}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`watsonx.ai API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results[0].generated_text;
  }
}
```

## Error Handling

```typescript
// lib/watsonx/errors.ts
export class WatsonXError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WatsonXError';
  }
}

export class VisionAnalysisError extends WatsonXError {
  constructor(message: string, details?: any) {
    super(message, 'VISION_ANALYSIS_ERROR', details);
    this.name = 'VisionAnalysisError';
  }
}

export class InvalidResponseError extends WatsonXError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_RESPONSE', details);
    this.name = 'InvalidResponseError';
  }
}
```

## Testing

```typescript
// lib/watsonx/__tests__/vision.test.ts
import { visionService } from '../vision';
import { readFileSync } from 'fs';

describe('VisionService', () => {
  it('should analyze a simple ERD', async () => {
    const imageBuffer = readFileSync('./test-fixtures/simple-erd.png');
    const result = await visionService.analyzeERD(imageBuffer, 'image/png');

    expect(result.entities).toBeDefined();
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.relationships).toBeDefined();
  });

  it('should handle invalid images', async () => {
    const invalidBuffer = Buffer.from('not an image');
    
    await expect(
      visionService.analyzeERD(invalidBuffer, 'image/png')
    ).rejects.toThrow();
  });
});
```

## Rate Limiting

```typescript
// lib/watsonx/rate-limiter.ts
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getWaitTime(): number {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = this.requests[0];
    const waitTime = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, waitTime);
  }
}

export const rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
```

## Caching Strategy

```typescript
// lib/watsonx/cache.ts
import { createHash } from 'crypto';

interface CacheEntry {
  schema: any;
  timestamp: number;
}

export class VisionCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 3600000; // 1 hour

  generateKey(imageBuffer: Buffer): string {
    return createHash('sha256').update(imageBuffer).digest('hex');
  }

  get(imageBuffer: Buffer): any | null {
    const key = this.generateKey(imageBuffer);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.schema;
  }

  set(imageBuffer: Buffer, schema: any): void {
    const key = this.generateKey(imageBuffer);
    this.cache.set(key, {
      schema,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const visionCache = new VisionCache();
```

## Environment Variables

```bash
# .env.local

# watsonx.ai Configuration
WATSONX_API_KEY=your_api_key_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id_here

# Optional: Rate limiting
WATSONX_MAX_REQUESTS_PER_MINUTE=10

# Optional: Cache TTL (in milliseconds)
WATSONX_CACHE_TTL=3600000
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key is correct
   - Check if service instance is active
   - Ensure project ID is valid

2. **Model Not Found**
   - Verify model ID is correct
   - Check if model is available in your region
   - Try alternative vision models

3. **Timeout Errors**
   - Increase maxDuration in route config
   - Optimize image size before upload
   - Implement retry logic

4. **Invalid Response Format**
   - Check prompt engineering
   - Add more specific instructions
   - Implement fallback parsing logic

### Debug Mode

```typescript
// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('watsonx.ai Request:', {
    projectId: this.projectId,
    modelId: 'meta-llama/llama-3-2-90b-vision-instruct',
    imageSize: imageBuffer.length,
  });
}
```

## Best Practices

1. **Image Preprocessing**
   - Resize large images to reduce processing time
   - Enhance contrast for better OCR
   - Convert to PNG for best quality

2. **Prompt Engineering**
   - Be specific about output format
   - Provide examples in the prompt
   - Use consistent terminology

3. **Error Recovery**
   - Implement retry logic with exponential backoff
   - Cache successful responses
   - Provide fallback options

4. **Cost Optimization**
   - Cache identical images
   - Compress images before upload
   - Use rate limiting
   - Monitor API usage

## Next Steps

After implementing watsonx.ai integration:

1. Test with various ERD diagram styles
2. Fine-tune prompts for better accuracy
3. Implement user feedback mechanism
4. Add support for hand-drawn diagrams
5. Create example ERD library
6. Monitor and optimize API costs

---

This guide provides everything needed to integrate watsonx.ai vision capabilities into Foundry. Adjust the implementation based on your specific requirements and the actual watsonx.ai API documentation.