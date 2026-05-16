'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, FileImage } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Reading your ERD diagram...');
  const [progress, setProgress] = useState(0);
  const [dbType, setDbType] = useState<'postgresql' | 'mysql' | 'sqlite'>('postgresql');

  useEffect(() => {
    if (!isUploading) {
      setProgress(0);
      return;
    }

    const messages = [
      'Reading your ERD diagram...',
      'Detecting entities and relationships...',
      'Analyzing table structures...',
      'Mapping foreign key relationships...',
      'Generating Prisma schema...',
      'Building API routes with CRUD...',
      'Creating Mermaid diagram...',
      'Almost done, finalizing output...',
    ];

    let index = 0;
    const messageInterval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 7000);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1.5, 90));
    }, 1000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isUploading]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      formData.append('dbType', dbType);

      // Upload to API
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze ERD');
      }

      const data = await response.json();
      
      // Store results in sessionStorage and navigate
      sessionStorage.setItem('erdResults', JSON.stringify(data));
      router.push('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsUploading(false);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileImage className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Foundry</h1>
              <p className="text-sm text-gray-400">ERD to Code Generator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-800/30 border-b border-gray-800">
        <div className="container mx-auto px-4 py-2 flex justify-center gap-8">
          <span className="text-sm text-gray-300 font-medium flex items-center gap-1">
            <span className="text-green-400">●</span> Powered by IBM watsonx.ai
          </span>
          <span className="text-sm text-gray-300 font-medium">⚡ Generate in ~60 seconds</span>
          <span className="text-sm text-gray-300 font-medium">📦 9 files generated</span>
          <span className="text-sm text-gray-300 font-medium">🗄️ PostgreSQL • MySQL • SQLite</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Transform ERD Diagrams into
              <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                {' '}Production-Ready Code
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Upload any ERD image and Foundry instantly generates a complete backend starter kit — Prisma schema, API routes, Docker config, and more. Powered by IBM watsonx.ai vision model.
            </p>
          </div>

          {/* Database Type Selector */}
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3 text-center">Select Database Type</p>
            <div className="flex justify-center gap-3">
              {(['postgresql', 'mysql', 'sqlite'] as const).map((db) => (
                <button
                  key={db}
                  onClick={() => setDbType(db)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    dbType === db
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {db === 'postgresql' ? '🐘 PostgreSQL' : db === 'mysql' ? '🐬 MySQL' : '🪶 SQLite'}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Zone */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 shadow-2xl">
            {preview && !isUploading ? (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-gray-700">
                  <img 
                    src={preview} 
                    alt="ERD Preview" 
                    className="w-full h-auto"
                  />
                </div>
                <button
                  onClick={() => {
                    setPreview(null);
                    setError(null);
                  }}
                  className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Upload Different Image
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragActive 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
                  }
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center gap-4">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-white">
                          {loadingMessage}
                        </p>
                        <p className="text-sm text-gray-400">
                          This may take a few moments
                        </p>
                      </div>
                      <div className="w-full max-w-xs mx-auto mt-4 space-y-2">
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center">{progress.toFixed(0)}% complete</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center">
                        <Upload className="w-10 h-10 text-blue-400" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-white">
                          {isDragActive ? 'Drop your ERD here' : 'Upload ERD Diagram'}
                        </p>
                        <p className="text-sm text-gray-400">
                          Drag & drop or click to select
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, JPEG up to 10MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Vision Engine</h3>
              <p className="text-sm text-gray-400">
                IBM watsonx.ai Llama 3.2 Vision reads your ERD and understands every entity, relationship, and constraint.
              </p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">9-File Starter Kit</h3>
              <p className="text-sm text-gray-400">
                Get schema, API routes, Docker config, TypeScript types, and more — all in one ZIP download.
              </p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">From Image to Code</h3>
              <p className="text-sm text-gray-400">
                What takes hours manually is done in ~60 seconds. Focus on building features, not boilerplate.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold text-gray-300 mb-6">How it works</h3>
            <div className="flex justify-center items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">1</span>
                Upload ERD Image
              </div>
              <span className="text-gray-600">→</span>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">2</span>
                AI Analyzes Diagram
              </div>
              <span className="text-gray-600">→</span>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">3</span>
                Select Database Type
              </div>
              <span className="text-gray-600">→</span>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">4</span>
                Download 9-File Bundle
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-gray-500">
            Foundry © 2026 — Built with ❤️ using IBM Bob, Next.js 14, and IBM watsonx.ai
          </p>
        </div>
      </footer>
    </main>
  );
}

// Made with Bob
