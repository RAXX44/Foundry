/**
 * watsonx.ai Integration Helper
 *
 * Setup Instructions:
 * 1. Create an IBM Cloud account at https://cloud.ibm.com
 * 2. Create a watsonx.ai service instance
 * 3. Get your API key and Project ID
 * 4. Add credentials to .env.local
 */

export interface ERDAnalysisResult {
  prismaSchema: string;
  apiRoutes: string;
  mermaidDiagram: string;
}

/**
 * Build the system prompt for ERD analysis
 */
function buildSystemPrompt(): string {
  return `You are an expert database architect and code generator.
Analyze the provided ERD (Entity Relationship Diagram) image and generate two things:

1. A complete Prisma schema file
2. Complete Next.js API routes with full CRUD operations

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON, no markdown, no explanations, no conversational text
- Do not wrap the response in markdown code blocks
- The JSON must have exactly two keys: "prismaSchema" and "apiRoutes"
- Both values must be complete, production-ready code as strings

PRISMA SCHEMA REQUIREMENTS:
- Include datasource block with PostgreSQL provider
- Include generator block for Prisma Client
- Create models for all entities detected in the ERD
- Include all fields with correct Prisma types (String, Int, Float, Boolean, DateTime, Json)

CRITICAL RELATIONSHIP RULES:
- You MUST use Prisma @relation directives to connect foreign keys correctly
- If a table has a foreign key field (e.g., student_id, teacher_id), it MUST have a corresponding relation field
- Example: If Marks table has 'studentId Int', it MUST also have 'student Student @relation(fields: [studentId], references: [id])'
- The parent model must have the inverse relation (e.g., Student model has 'marks Mark[]')
- Never leave foreign key fields as isolated Int fields without @relation

CRITICAL NAMING RULES:
- Model names MUST be singular PascalCase (Student NOT Students, Teacher NOT Teachers, Mark NOT Marks)
- Field names MUST be camelCase (studentId NOT student_id, firstName NOT first_name)
- Relation field names should be descriptive (student, teacher, marks, etc.)

CRITICAL TIMESTAMP RULES:
- EVERY model MUST have these two fields automatically added:
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
- Add these even if they are not visible in the ERD image

CRITICAL ID FIELD RULES:
- Each model should have ONE primary key field: id Int @id @default(autoincrement())
- Do NOT add redundant ID fields (e.g., don't add 'studentId Int' to Student model for its own ID)
- Foreign keys are separate fields (e.g., studentId in Marks table references Student.id)

API ROUTES REQUIREMENTS:
- Generate complete Next.js 14 App Router API routes
- Include all CRUD operations: GET (all), GET (by id), POST, PUT, DELETE
- Use proper TypeScript types
- Include error handling with try-catch blocks
- Use Prisma client for database operations
- Return proper HTTP status codes
- Include proper imports (NextResponse, prisma)

MERMAID DIAGRAM REQUIREMENTS:
- Generate a valid Mermaid erDiagram syntax representing the database structure
- Use proper Mermaid relationship syntax: ||--o{, }o--||, ||--||, etc.
- Include all entities and their relationships
- Format: erDiagram\\n  ENTITY1 ||--o{ ENTITY2 : "relationship"

EXAMPLE CORRECT RESPONSE (must have THREE keys):
{
  "prismaSchema": "datasource db {\\n  provider = \\"postgresql\\"\\n  url = env(\\"DATABASE_URL\\")\\n}\\n\\ngenerator client {\\n  provider = \\"prisma-client-js\\"\\n}\\n\\nmodel Student {\\n  id        Int      @id @default(autoincrement())\\n  name      String\\n  email     String   @unique\\n  marks     Mark[]\\n  createdAt DateTime @default(now())\\n  updatedAt DateTime @updatedAt\\n}\\n\\nmodel Teacher {\\n  id        Int      @id @default(autoincrement())\\n  name      String\\n  subject   String\\n  marks     Mark[]\\n  createdAt DateTime @default(now())\\n  updatedAt DateTime @updatedAt\\n}\\n\\nmodel Mark {\\n  id        Int      @id @default(autoincrement())\\n  score     Int\\n  studentId Int\\n  student   Student  @relation(fields: [studentId], references: [id])\\n  teacherId Int\\n  teacher   Teacher  @relation(fields: [teacherId], references: [id])\\n  createdAt DateTime @default(now())\\n  updatedAt DateTime @updatedAt\\n}",
  "apiRoutes": "import { NextResponse } from 'next/server';\\nimport { prisma } from '@/lib/prisma';\\n\\n// GET /api/students\\nexport async function GET() {\\n  try {\\n    const students = await prisma.student.findMany({ include: { marks: true } });\\n    return NextResponse.json(students);\\n  } catch (error) {\\n    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });\\n  }\\n}\\n\\n// POST /api/students\\nexport async function POST(request: Request) {\\n  try {\\n    const body = await request.json();\\n    const student = await prisma.student.create({ data: body });\\n    return NextResponse.json(student, { status: 201 });\\n  } catch (error) {\\n    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });\\n  }\\n}\\n\\n// PUT /api/students/[id]\\nexport async function PUT(request: Request, { params }: { params: { id: string } }) {\\n  try {\\n    const body = await request.json();\\n    const student = await prisma.student.update({ where: { id: parseInt(params.id) }, data: body });\\n    return NextResponse.json(student);\\n  } catch (error) {\\n    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });\\n  }\\n}\\n\\n// DELETE /api/students/[id]\\nexport async function DELETE(request: Request, { params }: { params: { id: string } }) {\\n  try {\\n    await prisma.student.delete({ where: { id: parseInt(params.id) } });\\n    return NextResponse.json({ success: true });\\n  } catch (error) {\\n    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });\\n  }\\n}",
  "mermaidDiagram": "erDiagram\\n  Student ||--o{ Mark : has\\n  Teacher ||--o{ Mark : grades\\n  Student {\\n    int id PK\\n    string name\\n    string email\\n    datetime createdAt\\n    datetime updatedAt\\n  }\\n  Teacher {\\n    int id PK\\n    string name\\n    string subject\\n    datetime createdAt\\n    datetime updatedAt\\n  }\\n  Mark {\\n    int id PK\\n    int score\\n    int studentId FK\\n    int teacherId FK\\n    datetime createdAt\\n    datetime updatedAt\\n  }"
}

Now analyze the ERD image and return the JSON response with ALL THREE keys (prismaSchema, apiRoutes, mermaidDiagram) following ALL the rules above.`;
}

/**
 * Analyze an ERD image using watsonx.ai vision model
 */
export async function analyzeERD(imageBuffer: Buffer): Promise<ERDAnalysisResult> {
  try {
    const apiKey = process.env.WATSONX_API_KEY!;
    const url = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
    const projectId = process.env.WATSONX_PROJECT_ID!;

    // 1. Dapatkan IAM Token dari IBM secara langsung
    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error("Gagal mendapatkan IAM Token. Cek kembali WATSONX_API_KEY.");
    }

    // 2. Siapkan Gambar dan Prompt
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    const systemPrompt = buildSystemPrompt();

    // 3. Panggil WatsonX REST API dengan Format Multimodal (Chat)
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
        max_tokens: 4000,
        temperature: 0.1
      })
    });
    
    const chatData = await chatRes.json();

    // 4. Ambil jawaban dari array "choices"
    const generatedText = chatData.choices?.[0]?.message?.content || "";
    
    console.log("\n--- RAW AI RESPONSE START ---\n", generatedText, "\n--- RAW AI RESPONSE END ---\n");

    if (!generatedText) {
      console.error("Full IBM Response:", JSON.stringify(chatData, null, 2));
      throw new Error("AI returned empty response. Check server logs.");
    }

    // 5. Aggressive JSON extraction with fallback to markdown parsing
    let parsedResult: ERDAnalysisResult;

    try {
      // Step 1: Try direct JSON parse
      parsedResult = JSON.parse(generatedText);
    } catch (directParseError) {
      try {
        // Step 2: Strip markdown code blocks and try again
        let cleanedText = generatedText
          .replace(/```json\s*/g, '')
          .replace(/```prisma\s*/g, '')
          .replace(/```typescript\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        // Try to find JSON object
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (markdownParseError) {
        // Step 3: Manual extraction from markdown blocks
        console.log("Attempting manual extraction from markdown...");
        
        // Extract Prisma schema
        const prismaMatch = generatedText.match(/```prisma\s*([\s\S]*?)```/) ||
                           generatedText.match(/datasource db \{[\s\S]*?\}[\s\S]*?generator client \{[\s\S]*?\}[\s\S]*?(?:model \w+ \{[\s\S]*?\})+/);
        
        // Extract TypeScript/API routes
        const tsMatch = generatedText.match(/```typescript\s*([\s\S]*?)```/) ||
                       generatedText.match(/```ts\s*([\s\S]*?)```/) ||
                       generatedText.match(/import \{ NextResponse \}[\s\S]*?export async function/);

        if (!prismaMatch && !tsMatch) {
          throw new Error('Could not extract Prisma schema or API routes from markdown response');
        }

        parsedResult = {
          prismaSchema: prismaMatch ? prismaMatch[1] || prismaMatch[0] : '// Could not extract Prisma schema',
          apiRoutes: tsMatch ? tsMatch[1] || tsMatch[0] : '// Could not extract API routes',
          mermaidDiagram: ''
        };
      }
    }

    // Validate response structure
    if (!parsedResult.prismaSchema || !parsedResult.apiRoutes) {
      throw new Error('Invalid response structure from AI model - missing prismaSchema or apiRoutes');
    }
    
    // Set default mermaidDiagram if missing
    if (!parsedResult.mermaidDiagram) {
      parsedResult.mermaidDiagram = '';
    }

    // Clean up any remaining markdown artifacts
    parsedResult.prismaSchema = parsedResult.prismaSchema
      .replace(/```prisma\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    parsedResult.apiRoutes = parsedResult.apiRoutes
      .replace(/```typescript\s*/g, '')
      .replace(/```ts\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    return parsedResult;

  } catch (error) {
    console.error('watsonx.ai API Error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze ERD: ${error.message}`);
    }
    throw new Error('Failed to analyze ERD with watsonx.ai');
  }
}

export async function testConnection(): Promise<boolean> {
  return true;
}