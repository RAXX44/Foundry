/**
 * AI Extraction Layer
 * Extracts ONLY structured JSON from ERD images using watsonx.ai
 * Does NOT generate code directly
 */

import type { AIExtractionResult } from '@/types/erd';

/**
 * Build system prompt for AI extraction
 * Instructs AI to return ONLY structured JSON, no code generation
 */
function buildExtractionPrompt(): string {
  return `You are an expert database architect analyzing ERD (Entity Relationship Diagram) images.

CRITICAL INSTRUCTIONS:
- Extract ONLY the structure as JSON
- Do NOT generate any code (no Prisma, no TypeScript, no SQL)
- Return ONLY valid JSON, no markdown, no explanations
- Do not wrap response in code blocks

Extract:
1. All tables/entities with their fields
2. All relationships between tables

JSON STRUCTURE:
{
  "tables": [
    {
      "name": "table_name",
      "fields": [
        {
          "name": "field_name",
          "type": "string|number|boolean|date",
          "required": true|false,
          "unique": true|false
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "TableA",
      "to": "TableB",
      "type": "one-to-many|one-to-one|many-to-many",
      "name": "relationship_name"
    }
  ]
}

FIELD TYPE MAPPING:
- Text/varchar/char → "string"
- Integer/number/id → "number"
- Boolean/bit → "boolean"
- Date/datetime/timestamp → "date"

RELATION TYPE RULES:
- One table has FK to another → "many-to-one" (from perspective of table with FK)
- One table referenced by many → "one-to-many" (from perspective of referenced table)
- Both tables have FK to each other → "one-to-one"
- Junction/bridge table → "many-to-many"

EXAMPLE RESPONSE:
{
  "tables": [
    {
      "name": "User",
      "fields": [
        { "name": "name", "type": "string", "required": true, "unique": false },
        { "name": "email", "type": "string", "required": true, "unique": true },
        { "name": "age", "type": "number", "required": false, "unique": false }
      ]
    },
    {
      "name": "Post",
      "fields": [
        { "name": "title", "type": "string", "required": true, "unique": false },
        { "name": "content", "type": "string", "required": true, "unique": false },
        { "name": "published", "type": "boolean", "required": true, "unique": false }
      ]
    }
  ],
  "relations": [
    {
      "from": "User",
      "to": "Post",
      "type": "one-to-many",
      "name": "posts"
    }
  ]
}

Now analyze the ERD image and return ONLY the JSON structure.`;
}

/**
 * Extract structured data from ERD image using watsonx.ai
 */
export async function extractERDStructure(imageBuffer: Buffer): Promise<AIExtractionResult> {
  try {
    const apiKey = process.env.WATSONX_API_KEY!;
    const url = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
    const projectId = process.env.WATSONX_PROJECT_ID!;

    // Get IAM Token
    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get IAM Token');
    }

    // Prepare image and prompt
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    const systemPrompt = buildExtractionPrompt();

    // Call watsonx.ai Vision API
    const chatRes = await fetch(`${url}/ml/v1/text/chat?version=2024-05-31`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_id: 'meta-llama/llama-3-2-90b-vision-instruct',
        project_id: projectId,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: imageDataUrl } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });
    
    const chatData = await chatRes.json();
    const generatedText = chatData.choices?.[0]?.message?.content || "";
    
    if (!generatedText) {
      throw new Error('AI returned empty response');
    }

    // Parse JSON response with fallback
    let result: AIExtractionResult;
    
    try {
      // Try direct parse
      result = JSON.parse(generatedText);
    } catch (e) {
      // Strip markdown and try again
      const cleaned = generatedText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract valid JSON from AI response');
      }
    }

    // Validate structure
    if (!result.tables || !Array.isArray(result.tables)) {
      throw new Error('Invalid AI response: missing tables array');
    }
    if (!result.relations || !Array.isArray(result.relations)) {
      result.relations = []; // Relations are optional
    }

    return result;

  } catch (error) {
    console.error('AI extraction error:', error);
    throw new Error(`Failed to extract ERD structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Made with Bob
