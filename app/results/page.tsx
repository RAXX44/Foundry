'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { Download, ArrowLeft, Copy, Check, ChevronDown } from 'lucide-react';
import Image from 'next/image';

interface GeneratedCode {
  prismaSchema: string;
  apiRoutes: string;
  mermaidDiagram: string;
  zodSchemas: string;
  seedScript: string;
}

interface FileItem {
  id: string;
  name: string;
  language: string;
  content: string;
  readOnly?: boolean;
}

interface FileGroup {
  group: string;
  icon: string;
  items: FileItem[];
}

// ─── FIX 1: Sanitize mermaid output dari AI ──────────────────────────────────
// watsonx kadang generate syntax yang tidak valid untuk mermaid v11:
//   - label relasi pakai tanda kutip → dihapus
//   - tipe field "string" → diganti "varchar"
//   - "datetime" → diganti "timestamp"
function sanitizeMermaid(chart: string): string {
  if (!chart) return '';

  return chart
    // 1. Amankan tanda kutip pada label relasi (Bawaan lu)
    .replace(/:\s*"([^"]+)"/g, ': $1')      
    .replace(/:\s*'([^']+)'/g, ': $1')       
    
    // 2. Normalisasi tipe data dasar (Bawaan lu)
    .replace(/\bstring\b/gi, 'varchar')       
    .replace(/\bdatetime\b/gi, 'timestamp')   
    
    // 3. FIX: Bersihkan modifier kunci ganda ilegal (seperti PK UK atau UK PK berjejeran)
    .replace(/\bPK\s+UK\b/gi, 'PK')
    .replace(/\bUK\s+PK\b/gi, 'PK')
    
    // 4. FIX: Bersihkan modifier 'ID' ilegal yang sering disisipkan AI sebelum tipe data
    .replace(/\bint\s+ID\s+PK\b/gi, 'int ID PK') // jika ID dianggap nama kolom
    // Jika AI nulis "int ID PK UK", regex nomor 3 & 4 akan merapikannya jadi "int ID PK"
    
    // 5. Normalisasi spasi ganda di dalam block agar token parser tidak bingung
    .replace(/ {2,}/g, ' ')
    
    // 6. Normalize line endings (Bawaan lu)
    .replace(/\r\n/g, '\n')                   
    .trim();
}

// ─── FIX 2: Render mermaid client-side, tanpa CDN eksternal ──────────────────
// Tidak ada lagi request ke mermaid.ink → tidak ada 400 error di local / Vercel
function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chart || !containerRef.current) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          er: {
            diagramPadding: 40,
            layoutDirection: 'TB',
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
          },
          securityLevel: 'loose',
        });

        const cleanChart = sanitizeMermaid(chart);
        const id = `mermaid-erd-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanChart);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
          }
        }
      } catch (err) {
        console.error('[MermaidDiagram] render error:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [chart]);

  if (!chart) {
    return (
      <div className="flex items-center justify-center w-full min-h-[500px]">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No diagram available</p>
          <p className="text-gray-600 text-xs mt-1">Generate a schema to preview ERD</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full min-h-[500px]">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-500 text-sm mb-1">Failed to render diagram</p>
          <p className="text-gray-600 text-xs font-mono">Check console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[500px] flex items-start justify-center p-10">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Rendering ERD...
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full"
        style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease' }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const router = useRouter();
  const [code, setCode] = useState<GeneratedCode>({
    prismaSchema: '',
    apiRoutes: '',
    mermaidDiagram: '',
    zodSchemas: '',
    seedScript: '',
  });
  const [copied, setCopied] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Database: true,
    Backend: true,
    Config: true,
    DevOps: true,
    Docs: true,
  });
  const [dbType, setDbType] = useState('postgresql');

  const modelNames = code.prismaSchema
    .match(/model\s+(\w+)\s*\{/g)
    ?.map((m) => m.replace(/model\s+/, '').replace(/\s*\{/, '')) ?? [];

  function mapPrismaTypeToTS(prismaType: string): string {
    const t = prismaType.replace('?', '').replace('[]', '');
    const optional = prismaType.includes('?');
    const arr = prismaType.includes('[]');
    const map: Record<string, string> = {
      String: 'string', Int: 'number', Float: 'number', Decimal: 'number',
      Boolean: 'boolean', DateTime: 'Date', Json: 'Record<string, unknown>',
      BigInt: 'bigint', Bytes: 'Buffer',
    };
    let tsType = map[t] || t;
    if (arr) tsType = `${tsType}[]`;
    if (optional) tsType = `${tsType} | null`;
    return tsType;
  }

  function extractModelFields(schema: string, modelName: string): string[] {
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\}`, 'm');
    const match = schema.match(modelRegex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//') && !l.startsWith('@') && !l.startsWith('@@'))
      .map((l) => l.split(/\s+/))
      .filter((parts) => parts.length >= 2)
      .map((parts) => `  ${parts[0]}: ${mapPrismaTypeToTS(parts[1])};`);
  }

  const typesTs = `// Auto-generated TypeScript interfaces by Foundry
// Powered by IBM watsonx.ai

${modelNames.map((m) => {
    const fields = extractModelFields(code.prismaSchema, m);
    return `export interface ${m} {\n${fields.length > 0 ? fields.join('\n') : '  id: number;\n  createdAt: Date;\n  updatedAt: Date;'}\n}`;
  }).join('\n\n')}

// Input types (for POST/PUT requests)
${modelNames.map((m) => `export type Create${m}Input = Omit<${m}, 'id' | 'createdAt' | 'updatedAt'>;\nexport type Update${m}Input = Partial<Create${m}Input>;`).join('\n')}
`;

  const prismaClientTs = `import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };
`;

  const envExamples: Record<string, string> = {
    postgresql: `# PostgreSQL\nDATABASE_URL="postgresql://user:password@localhost:5432/mydb"\nNODE_ENV="development"`,
    mysql: `# MySQL\nDATABASE_URL="mysql://user:password@localhost:3306/mydb"\nNODE_ENV="development"`,
    sqlite: `# SQLite (no server needed)\nDATABASE_URL="file:./dev.db"\nNODE_ENV="development"`,
  };

  const dockerComposeMap: Record<string, string> = {
    postgresql: `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:`,
    mysql: `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://root:password@db:3306/mydb
    depends_on:
      - db
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: mydb
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
volumes:
  mysql_data:`,
    sqlite: `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./prisma:/app/prisma`,
  };

  const dockerfileContent = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`;

  const ciYml = `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --if-present
      - run: npx prisma generate
      - run: npm run build
`;

  const gitignoreContent = `node_modules/
.env
.env.local
.next/
dist/
*.log
prisma/*.db`;

  const healthRouteTs = `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    models: ${JSON.stringify(modelNames)},
    generatedBy: 'Foundry — IBM watsonx.ai',
  });
}`;

  const postmanCollection = JSON.stringify({
    info: {
      name: 'Foundry Generated API',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: modelNames.map((m) => ({
      name: m,
      item: [
        { name: `Get all ${m}`, request: { method: 'GET', url: { raw: `{{baseUrl}}/api/${m.toLowerCase()}`, host: ['{{baseUrl}}'], path: ['api', m.toLowerCase()] } } },
        { name: `Get ${m} by ID`, request: { method: 'GET', url: { raw: `{{baseUrl}}/api/${m.toLowerCase()}/1`, host: ['{{baseUrl}}'], path: ['api', m.toLowerCase(), '1'] } } },
        { name: `Create ${m}`, request: { method: 'POST', url: { raw: `{{baseUrl}}/api/${m.toLowerCase()}`, host: ['{{baseUrl}}'], path: ['api', m.toLowerCase()] }, header: [{ key: 'Content-Type', value: 'application/json' }], body: { mode: 'raw', raw: '{}' } } },
        { name: `Update ${m}`, request: { method: 'PUT', url: { raw: `{{baseUrl}}/api/${m.toLowerCase()}/1`, host: ['{{baseUrl}}'], path: ['api', m.toLowerCase(), '1'] }, header: [{ key: 'Content-Type', value: 'application/json' }], body: { mode: 'raw', raw: '{}' } } },
        { name: `Delete ${m}`, request: { method: 'DELETE', url: { raw: `{{baseUrl}}/api/${m.toLowerCase()}/1`, host: ['{{baseUrl}}'], path: ['api', m.toLowerCase(), '1'] } } },
      ],
    })),
    variable: [{ key: 'baseUrl', value: 'http://localhost:3000' }],
  }, null, 2);

  const endpointsList = modelNames
    .map((m) => `### ${m}\n- \`GET    /api/${m.toLowerCase()}\`\n- \`GET    /api/${m.toLowerCase()}/[id]\`\n- \`POST   /api/${m.toLowerCase()}\`\n- \`PUT    /api/${m.toLowerCase()}/[id]\`\n- \`DELETE /api/${m.toLowerCase()}/[id]\``)
    .join('\n\n');

  const readmeContent = `# Generated by Foundry 🔥
> Powered by IBM watsonx.ai · Built with IBM Bob IDE

## 📦 Models Detected
${modelNames.map((m) => `- \`${m}\``).join('\n')}

## 🚀 Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Generate Prisma client
npx prisma generate

# 5. Seed dummy data
npx ts-node prisma/seed.ts

# 6. Start development server
npm run dev
\`\`\`

## 🛣️ API Endpoints

${endpointsList}

## 📁 Files in this Bundle
- \`schema.prisma\` — Prisma database schema
- \`lib/prisma.ts\` — Prisma client singleton
- \`routes.ts\` — Next.js API routes (full CRUD)
- \`types.ts\` — TypeScript interfaces
- \`schemas/validation.ts\` — Zod validation schemas
- \`prisma/seed.ts\` — Seed script with faker.js
- \`postman_collection.json\` — Import to Postman to test API
- \`.github/workflows/ci.yml\` — GitHub Actions CI/CD
- \`Dockerfile\` + \`docker-compose.yml\` — Docker setup
- \`.env.example\` — Environment variable template

---
*Generated with [Foundry](https://github.com/foundry) in under 60 seconds.*
`;

  const files: FileGroup[] = [
    {
      group: 'Database',
      icon: '🗄️',
      items: [
        { id: 'schema', name: 'schema.prisma',  language: 'prisma',     content: code.prismaSchema },
        { id: 'seed',   name: 'prisma/seed.ts', language: 'typescript', content: code.seedScript },
      ],
    },
    {
      group: 'Backend',
      icon: '⚡',
      items: [
        { id: 'routes', name: 'routes.ts',               language: 'typescript', content: code.apiRoutes },
        { id: 'zod',    name: 'schemas/validation.ts',   language: 'typescript', content: code.zodSchemas },
        { id: 'types',  name: 'types.ts',                language: 'typescript', content: typesTs,       readOnly: true },
        { id: 'health', name: 'app/api/health/route.ts', language: 'typescript', content: healthRouteTs, readOnly: true },
      ],
    },
    {
      group: 'Config',
      icon: '⚙️',
      items: [
        { id: 'prismaClient', name: 'lib/prisma.ts', language: 'typescript', content: prismaClientTs,                               readOnly: true },
        { id: 'env',          name: '.env.example',  language: 'plaintext',  content: envExamples[dbType] || envExamples.postgresql, readOnly: true },
        { id: 'gitignore',    name: '.gitignore',    language: 'plaintext',  content: gitignoreContent,                             readOnly: true },
      ],
    },
    {
      group: 'DevOps',
      icon: '🐳',
      items: [
        { id: 'docker',     name: 'docker-compose.yml',       language: 'yaml',       content: dockerComposeMap[dbType] || dockerComposeMap.postgresql, readOnly: true },
        { id: 'dockerfile', name: 'Dockerfile',                language: 'dockerfile', content: dockerfileContent,                                      readOnly: true },
        { id: 'ci',         name: '.github/workflows/ci.yml', language: 'yaml',       content: ciYml,                                                  readOnly: true },
      ],
    },
    {
      group: 'Docs',
      icon: '📄',
      items: [
        { id: 'readme',  name: 'README.md',               language: 'markdown', content: readmeContent,     readOnly: true },
        { id: 'postman', name: 'postman_collection.json', language: 'json',     content: postmanCollection, readOnly: true },
      ],
    },
  ];

  const [selectedFile, setSelectedFile] = useState<FileItem>(files[0].items[0]);

  useEffect(() => {
    const resultsStr = sessionStorage.getItem('erdResults');
    if (!resultsStr) { router.push('/'); return; }
    try {
      const results = JSON.parse(resultsStr);
      setDbType(results.dbType || 'postgresql');
      setCode({
        prismaSchema:   results.prismaSchema   || '// Schema will be generated here',
        apiRoutes:      results.apiRoutes      || '// API routes will be generated here',
        mermaidDiagram: results.mermaidDiagram || '',
        zodSchemas:     results.zodSchemas     || '// Zod schemas will be generated here',
        seedScript:     results.seedScript     || '// Seed script will be generated here',
      });
    } catch (error) {
      console.error('Failed to parse results:', error);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    setSelectedFile((prev) => {
      const allItems = files.flatMap((g) => g.items);
      const updated = allItems.find((f) => f.id === prev.id);
      return updated ?? prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, dbType]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name.split('/').pop() || selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('schema.prisma',            code.prismaSchema);
    zip.file('lib/prisma.ts',            prismaClientTs);
    zip.file('routes.ts',                code.apiRoutes);
    zip.file('types.ts',                 typesTs);
    zip.file('schemas/validation.ts',    code.zodSchemas || '// Zod schemas');
    zip.file('prisma/seed.ts',           code.seedScript || '// Seed script');
    zip.file('postman_collection.json',  postmanCollection);
    zip.file('.github/workflows/ci.yml', ciYml);
    zip.file('Dockerfile',               dockerfileContent);
    zip.file('docker-compose.yml',       dockerComposeMap[dbType] || dockerComposeMap.postgresql);
    zip.file('.env.example',             envExamples[dbType] || envExamples.postgresql);
    zip.file('.gitignore',               gitignoreContent);
    zip.file('app/api/health/route.ts',  healthRouteTs);
    zip.file('README.md',                readmeContent);
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foundry-generated.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const fileIcon = (item: FileItem): string => {
    const name = item.name;
    if (name.endsWith('.prisma'))                        return '🟦';
    if (name.endsWith('.json'))                           return '🟫';
    if (name.endsWith('.yml') || name.endsWith('.yaml')) return '🟧';
    if (name.endsWith('.md'))                             return '📝';
    if (name === 'Dockerfile')                            return '🐳';
    if (name.startsWith('.'))                             return '⚙️';
    return '🟨';
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col">

      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-2xl z-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="container mx-auto px-6 py-4 flex items-center justify-between relative z-10">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-500 hover:text-white transition-all duration-200 text-sm hover:translate-x-[-2px]">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-lg shadow-blue-500/10">
                <Image src="/asset/logo.png" alt="Foundry Logo" width={28} height={28} className="object-contain" priority />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold tracking-wide text-sm">Foundry</span>
                <span className="text-gray-700 text-xs">/</span>
                <span className="text-gray-400 text-sm">Generated Code</span>
              </div>
              <span className="text-[10px] text-gray-600 tracking-widest uppercase">Powered by watsonx.ai</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-300 font-medium">AI Active</span>
          </div>
        </div>
      </header>

      {/* Models banner */}
      {code.prismaSchema && modelNames.length > 0 && (
        <div className="flex-shrink-0 bg-emerald-500/5 border-b border-emerald-500/15 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-2.5 flex items-center gap-2 flex-wrap">
            <span className="text-emerald-400 text-xs">✓</span>
            <span className="text-emerald-400 text-xs font-medium">{modelNames.length} models detected:</span>
            <div className="flex gap-1.5 flex-wrap">
              {modelNames.map((m) => (
                <span key={m} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-300 font-mono hover:bg-emerald-500/20 transition-colors">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-grow container mx-auto px-6 py-6 flex flex-col gap-6">

        {/* VSCode Workspace */}
        <div className="grid grid-cols-12 gap-4 min-h-[700px]">

          {/* Explorer */}
          <div className="col-span-2 bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden flex flex-col backdrop-blur-xl">
            <div className="px-3 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Explorer</p>
              <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{files.flatMap((g) => g.items).length} files</span>
            </div>
            <div className="flex-grow overflow-y-auto py-1">
              {files.map((group) => (
                <div key={group.group}>
                  <button onClick={() => toggleGroup(group.group)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors">
                    <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ${openGroups[group.group] ? '' : '-rotate-90'}`} />
                    <span>{group.icon}</span>
                    {group.group}
                  </button>
                  {openGroups[group.group] && group.items.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`relative overflow-hidden w-full flex items-center gap-1.5 pl-7 pr-2 py-1 text-left transition-all duration-200 ${
                        selectedFile.id === file.id ? 'bg-blue-500/15 text-blue-300' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] hover:translate-x-[2px]'
                      }`}
                    >
                      {selectedFile.id === file.id && <div className="absolute left-0 top-0 h-full w-[2px] bg-blue-400" />}
                      <span className="text-sm leading-none flex-shrink-0">{fileIcon(file)}</span>
                      <span className="truncate font-mono text-[11px]">{file.name.split('/').pop()}</span>
                      {file.readOnly && <span className="ml-auto text-[9px] text-gray-700 flex-shrink-0">ro</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="col-span-6 bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none flex-shrink-0">{fileIcon(selectedFile)}</span>
                <span className="text-xs text-gray-300 font-mono truncate">{selectedFile.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-mono flex-shrink-0">{selectedFile.language}</span>
                {selectedFile.readOnly && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 font-mono flex-shrink-0">read-only</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={handleCopy} className="p-1.5 text-gray-500 hover:text-white transition-colors rounded hover:bg-white/5" title="Copy">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={handleDownloadFile} className="p-1.5 text-gray-500 hover:text-white transition-colors rounded hover:bg-white/5" title="Download file">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-hidden">
              <Editor
                key={selectedFile.id}
                height="100%"
                language={selectedFile.language}
                value={selectedFile.content}
                theme="vs-dark"
                options={{
                  readOnly: selectedFile.readOnly ?? false,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                }}
                onChange={(value) => {
                  if (selectedFile.readOnly) return;
                  const updated = value || '';
                  if (selectedFile.id === 'schema')      setCode((c) => ({ ...c, prismaSchema: updated }));
                  else if (selectedFile.id === 'routes') setCode((c) => ({ ...c, apiRoutes: updated }));
                  else if (selectedFile.id === 'zod')    setCode((c) => ({ ...c, zodSchemas: updated }));
                  else if (selectedFile.id === 'seed')   setCode((c) => ({ ...c, seedScript: updated }));
                }}
              />
            </div>
          </div>

          {/* Right Panel */}
          <div className="col-span-4 flex flex-col gap-4">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Project Metrics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-2xl font-bold text-blue-300">{modelNames.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Models</p>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4">
                  <p className="text-2xl font-bold text-purple-300">{modelNames.length * 5}</p>
                  <p className="text-xs text-gray-500 mt-1">CRUD Endpoints</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-300">Docker</p>
                  <p className="text-xs text-gray-500 mt-1">Ready</p>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
                  <p className="text-2xl font-bold text-orange-300">CI/CD</p>
                  <p className="text-xs text-gray-500 mt-1">Included</p>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Generation Summary</h3>
              <div className="space-y-2 text-xs">
                {['Prisma Schema','REST API Routes','TypeScript Types','Zod Validation','Seed Script','Prisma Client','Docker Setup','GitHub CI/CD','Postman Collection','Health Endpoint'].map((label) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-emerald-400">✓</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                <button onClick={handleDownloadAll} className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                  <span>📦</span> Download All (.zip)
                </button>
                <button onClick={() => router.push('/')} className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-semibold text-sm transition-colors border border-white/10 flex items-center justify-center gap-2">
                  <span>🔄</span> Generate Another
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[{ icon: '🚀', label: 'Deploy Neon' },{ icon: '🐙', label: 'Push GitHub' },{ icon: '🐳', label: 'Docker Deploy' },{ icon: '📄', label: 'API Docs' }].map(({ icon, label }) => (
                  <button key={label} disabled className="px-2 py-2 bg-white/[0.02] text-gray-600 rounded-lg text-xs border border-white/5 cursor-not-allowed flex items-center justify-center gap-1">
                    {icon} {label}
                    <span className="bg-white/5 px-1 py-0.5 rounded text-[9px] text-gray-600 ml-0.5">Soon</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ ERD — client-side render, no CDN, auto-sanitize AI output */}
        <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔮</span>
              <div>
                <h3 className="text-sm font-semibold text-white">Live ERD Diagram</h3>
                <p className="text-xs text-gray-500">Visual database architecture preview</p>
              </div>
            </div>
            {modelNames.length > 0 && (
              <div className="flex gap-2 flex-wrap justify-end">
                {modelNames.map((model) => (
                  <span key={model} className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-mono">
                    {model}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="relative bg-[#f8fafc] overflow-auto min-h-[650px] max-h-[900px]">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <MermaidDiagram chart={code.mermaidDiagram} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-white/5 mt-auto">
        <div className="container mx-auto px-6 py-5">
          <p className="text-center text-xs text-gray-600">
            Foundry © 2026 — Built with ❤️ using{' '}
            <span className="text-gray-500">IBM Bob IDE</span>,{' '}
            <span className="text-gray-500">Next.js 14</span>, and{' '}
            <span className="text-gray-500">IBM watsonx.ai</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Made with Bob