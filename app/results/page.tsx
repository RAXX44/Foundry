'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { Download, ArrowLeft, Copy, Check } from 'lucide-react';

interface GeneratedCode {
  prismaSchema: string;
  apiRoutes: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [code, setCode] = useState<GeneratedCode>({
    prismaSchema: '',
    apiRoutes: '',
  });
  const [activeTab, setActiveTab] = useState<'schema' | 'routes'>('schema');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load results from sessionStorage
    const resultsStr = sessionStorage.getItem('erdResults');
    if (!resultsStr) {
      router.push('/');
      return;
    }

    try {
      const results = JSON.parse(resultsStr);
      setCode({
        prismaSchema: results.prismaSchema || '// Schema will be generated here',
        apiRoutes: results.apiRoutes || '// API routes will be generated here',
      });
    } catch (error) {
      console.error('Failed to parse results:', error);
      router.push('/');
    }
  }, [router]);

  const handleCopy = async () => {
    const textToCopy = activeTab === 'schema' ? code.prismaSchema : code.apiRoutes;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeTab === 'schema' ? code.prismaSchema : code.apiRoutes;
    const filename = activeTab === 'schema' ? 'schema.prisma' : 'routes.ts';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Upload</span>
            </button>
            <h1 className="text-xl font-bold text-white">Generated Code</h1>
            <div className="w-32" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <div className="grid md:grid-cols-2 gap-6 h-full">
          {/* Prisma Schema Editor */}
          <div className="flex flex-col bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'schema'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  schema.prisma
                </button>
                <button
                  onClick={() => setActiveTab('routes')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'routes'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  API Routes
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                  title="Download file"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={activeTab === 'schema' ? 'prisma' : 'typescript'}
                value={activeTab === 'schema' ? code.prismaSchema : code.apiRoutes}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
                onChange={(value) => {
                  if (activeTab === 'schema') {
                    setCode({ ...code, prismaSchema: value || '' });
                  } else {
                    setCode({ ...code, apiRoutes: value || '' });
                  }
                }}
              />
            </div>
          </div>

          {/* Second Editor (Mirror) */}
          <div className="flex flex-col bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-400">
                  {activeTab === 'schema' ? 'API Routes Preview' : 'Schema Preview'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const textToCopy = activeTab === 'schema' ? code.apiRoutes : code.prismaSchema;
                    await navigator.clipboard.writeText(textToCopy);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    const content = activeTab === 'schema' ? code.apiRoutes : code.prismaSchema;
                    const filename = activeTab === 'schema' ? 'routes.ts' : 'schema.prisma';
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
                  title="Download file"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language={activeTab === 'schema' ? 'typescript' : 'prisma'}
                value={activeTab === 'schema' ? code.apiRoutes : code.prismaSchema}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
                onChange={(value) => {
                  if (activeTab === 'schema') {
                    setCode({ ...code, apiRoutes: value || '' });
                  } else {
                    setCode({ ...code, prismaSchema: value || '' });
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => {
              // Download both files as a zip would go here
              handleDownload();
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Download All Files
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Generate Another
          </button>
        </div>
      </div>
    </main>
  );
}

// Made with Bob
