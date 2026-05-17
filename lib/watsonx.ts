/**
 * watsonx.ai Integration Helper
 * Optimized for maximum ERD extraction accuracy
 */

export interface ERDAnalysisResult {
  prismaSchema: string;
  apiRoutes: string;
  mermaidDiagram: string;
  zodSchemas: string;
  seedScript: string;
}

// Detect MIME type from buffer magic bytes
function detectMimeType(buffer: Buffer): string {
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  if (hex.startsWith('89504E47')) return 'image/png';
  if (hex.startsWith('FFD8FF')) return 'image/jpeg';
  if (hex.startsWith('47494638')) return 'image/gif';
  const hex12 = buffer.toString('hex', 8, 12).toUpperCase();
  if (hex12 === '57454250') return 'image/webp';
  return 'image/png';
}

// Sanitize double-escaped strings from watsonx output
function sanitize(str: string): string {
  if (!str || typeof str !== 'string') return '';

  let result = str;

  if (result.startsWith('"') && result.endsWith('"')) {
    try { result = JSON.parse(result); } catch { /* continue */ }
  }

  result = result
    .replace(/\\\\n/g, '\n')
    .replace(/\\\\t/g, '\t')
    .replace(/\\\\r/g, '')
    .replace(/\\\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '')
    .replace(/\\"/g, '"');

  result = result
    .replace(/```prisma\s*/gi, '')
    .replace(/```typescript\s*/gi, '')
    .replace(/```mermaid\s*/gi, '')
    .replace(/```ts\s*/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '');

  return result.trim();
}

// Fix literal unescaped newlines inside JSON string values
// Root cause: watsonx returns {"key": "line1\nline2"} with REAL newlines, not \n
function fixUnescapedNewlines(jsonStr: string): string {
  let fixed = '';
  let inString = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    const prev = i > 0 ? jsonStr[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
      fixed += ch;
    } else if (inString) {
      if (ch === '\n') fixed += '\\n';
      else if (ch === '\r') fixed += '\\r';
      else if (ch === '\t') fixed += '\\t';
      else fixed += ch;
    } else {
      fixed += ch;
    }
  }

  return fixed;
}

function tryParse(s: string): ERDAnalysisResult | null {
  try {
    const p = JSON.parse(s);
    return p && p.prismaSchema ? p : null;
  } catch {
    return null;
  }
}

function extractJSON(text: string): ERDAnalysisResult | null {
  // Strip markdown fences
  const stripped = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Strategy 1: direct parse
  const r1 = tryParse(stripped);
  if (r1) return r1;

  // Find outermost { }
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');

  if (start !== -1 && end > start) {
    const block = stripped.slice(start, end + 1);

    // Strategy 2: parse block directly
    const r2 = tryParse(block);
    if (r2) return r2;

    // Strategy 3: fix unescaped newlines then parse — MAIN FIX
    const r3 = tryParse(fixUnescapedNewlines(block));
    if (r3) return r3;
  }

  // Strategy 4: manual field extraction — last resort
  const grabField = (key: string): string => {
    const pattern = '"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*?)"';
    const m = text.match(new RegExp(pattern));
    if (!m) return '';
    return m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"');
  };

  const prismaSchema = grabField('prismaSchema');
  const apiRoutes = grabField('apiRoutes');

  if (prismaSchema && apiRoutes) {
    return {
      prismaSchema,
      apiRoutes,
      mermaidDiagram: grabField('mermaidDiagram'),
      zodSchemas: grabField('zodSchemas'),
      seedScript: grabField('seedScript'),
    };
  }

  return null;
}

function buildSystemPrompt(dbType: string): string {
  const dbUrl = dbType === 'sqlite'
    ? 'url = "file:./dev.db"'
    : 'url = env("DATABASE_URL")';

  const lines = [
    'You are a world-class database architect and senior backend engineer.',
    'Your ONLY job is to analyze ERD diagram images and return structured code.',
    '',
    'ABSOLUTE RULES:',
    '- Analyze EVERY table, column, data type, PK, FK, and relationship in the image',
    '- Return ONLY a raw JSON object — no markdown, no backticks, no explanation',
    '- NEVER return "Could not extract" — always produce complete valid output',
    '- If unclear, make a reasonable professional assumption',
    '',
    'Return exactly this JSON structure:',
    '{"prismaSchema":"...","apiRoutes":"...","mermaidDiagram":"...","zodSchemas":"...","seedScript":"..."}',
    '',
    'PRISMA SCHEMA RULES:',
    '- Provider: ' + dbType,
    '- ' + dbUrl,
    '- Model names: singular PascalCase (Customer NOT Customers)',
    '- Field names: camelCase (customerId NOT customer_id)',
    '- Every model MUST have: id Int @id @default(autoincrement()), createdAt DateTime @default(now()), updatedAt DateTime @updatedAt',
    '- NEVER add self-relations (Customer must NOT relate to Customer)',
    '- NEVER duplicate models',
    '- NEVER add redundant ID fields like CustomerID if id already exists',
    '- FK field naming: customerId Int (NOT CustomerID)',
    '- Every FK field needs @relation. Example:',
    '-   customerId  Int',
    '-   customer    Customer  @relation(fields: [customerId], references: [id])',
    '- Parent models MUST have inverse array relations. Example:',
    '-   In Customer: requests Request[]',
    '- One-to-one: use @unique on FK field and singular inverse (inventory Inventory?)',
    '- API routes must import prisma from @/lib/prisma — never new PrismaClient()',
    '',
    'API ROUTES RULES:',
    '- Next.js 14 App Router, TypeScript',
    '- Full CRUD per model: GET all, GET by id, POST, PUT, DELETE',
    '- try-catch error handling, proper HTTP status codes',
    '- Import ONLY: import { prisma } from @/lib/prisma — never instantiate PrismaClient directly',
    '',
    'MERMAID DIAGRAM RULES:',
    '- Start with exactly: erDiagram',
    '- Syntax: PARENT ||--o{ CHILD : "label"',
    '- ||--o{ = one-to-many, ||--|| = one-to-one, }o--o{ = many-to-many',
    '- NEVER make a table relate to itself',
    '- ONLY add relations that match actual FK in the ERD image',
    '- Correct example: Customer ||--o{ Request : "customerId"',
    '- Correct example: Request ||--o{ Transaction : "requestId"',
    '- After relations, list fields: ENTITY { String name Int id }',
    '',
    'ZOD SCHEMAS RULES:',
    '- Import z from zod',
    '- Create[Model]Schema and Update[Model]Schema per model',
    '- Update schemas: all fields .optional()',
    '',
    'SEED SCRIPT RULES:',
    '- Use @faker-js/faker and PrismaClient',
    '- 5 rows per model with realistic faker data',
    '- Respect FK order (parents before children)',
    '- End with: main().catch(console.error).finally(() => prisma.$disconnect())',
    '',
    'IMPORTANT: Return ONLY the raw JSON. No markdown. No explanation. No code fences.',
  ];

  return lines.join('\n');
}

export async function analyzeERD(
  imageBuffer: Buffer,
  dbType: string = 'postgresql'
): Promise<ERDAnalysisResult> {
  const apiKey = process.env.WATSONX_API_KEY;
  const baseUrl = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
  const projectId = process.env.WATSONX_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('Missing WATSONX_API_KEY or WATSONX_PROJECT_ID in environment variables.');
  }

  // Step 1: Get IAM Token
  const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=' + apiKey,
  });

  if (!tokenRes.ok) {
    throw new Error('IAM token request failed: ' + tokenRes.status + ' ' + tokenRes.statusText);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get IAM Token. Check WATSONX_API_KEY.');
  }

  // Step 2: Prepare image with correct MIME type
  const mimeType = detectMimeType(imageBuffer);
  const base64Image = imageBuffer.toString('base64');
  const imageDataUrl = 'data:' + mimeType + ';base64,' + base64Image;

  console.log('[watsonx] Image: ' + (imageBuffer.length / 1024).toFixed(1) + 'KB, MIME: ' + mimeType + ', DB: ' + dbType);

  // Step 3: Call watsonx vision API
  const chatRes = await fetch(baseUrl + '/ml/v1/text/chat?version=2024-05-31', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + tokenData.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'meta-llama/llama-3-2-90b-vision-instruct',
      project_id: projectId,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(dbType),
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this ERD diagram completely. Extract every table, column, data type, primary key, foreign key, and relationship. Return only the JSON object.',
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
      max_tokens: 8000,
      temperature: 0.05,
    }),
  });

  if (!chatRes.ok) {
    const errText = await chatRes.text();
    throw new Error('watsonx API error: ' + chatRes.status + ' ' + errText.slice(0, 300));
  }

  const chatData = await chatRes.json();

  // Step 4: Extract raw text
  const rawContent = chatData.choices?.[0]?.message?.content;
  const generatedText: string = Array.isArray(rawContent)
    ? rawContent.map((c: { text?: string }) => c.text || '').join('')
    : (rawContent || '');

  console.log('[watsonx] Raw response (first 500 chars):\n' + generatedText.slice(0, 500));

  if (!generatedText || generatedText.trim().length === 0) {
    console.error('[watsonx] Full API response:', JSON.stringify(chatData, null, 2));
    throw new Error('watsonx returned empty response.');
  }

  // Step 5: Parse JSON with multi-strategy fallback
  const parsed = extractJSON(generatedText);

  if (!parsed) {
    console.error('[watsonx] Could not parse JSON. Raw:\n' + generatedText.slice(0, 800));
    throw new Error('AI response did not contain valid JSON. Check server logs.');
  }

  // Step 6: Sanitize all fields
  const result: ERDAnalysisResult = {
    prismaSchema: sanitize(parsed.prismaSchema || '// Schema generation failed'),
    apiRoutes: sanitize(parsed.apiRoutes || '// Routes generation failed'),
    mermaidDiagram: sanitize(parsed.mermaidDiagram || ''),
    zodSchemas: sanitize(parsed.zodSchemas || '// Zod schemas generation failed'),
    seedScript: sanitize(parsed.seedScript || '// Seed script generation failed'),
  };

  // Step 7: Fix mermaid header if missing
  if (result.mermaidDiagram && !result.mermaidDiagram.trimStart().startsWith('erDiagram')) {
    result.mermaidDiagram = 'erDiagram\n' + result.mermaidDiagram;
  }

  const detectedModels = (result.prismaSchema.match(/^model\s+\w+/gm) || []).join(', ');
  console.log('[watsonx] Success. Models: ' + detectedModels);

  return result;
}

export async function testConnection(): Promise<boolean> {
  return true;
}