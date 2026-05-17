'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import Link from 'next/link';
import { Upload, Loader2, Zap, Box, Code2, Database, Workflow, Rocket, Sparkles, Terminal } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing watsonx.ai vision...');
  const [progress, setProgress] = useState(0);
  const [dbType, setDbType] = useState<'postgresql' | 'mysql' | 'sqlite'>('postgresql');

  useEffect(() => {
    if (!isUploading) {
      setProgress(0);
      return;
    }

    const messages = [
      'Parsing visual diagram with watsonx.ai...',
      'Extracting entities & relations...',
      'Generating Prisma schema & Faker seeds...',
      'Writing Zod validation schemas...',
      'Scaffolding Next.js API routes...',
      'Configuring Docker & CI/CD Actions...',
      'Bundling 13-file enterprise workspace...',
    ];

    let index = 0;
    const messageInterval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 4000);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 95));
    }, 1000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isUploading]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Invalid format. Please use PNG or JPG.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Payload too large. Keep it under 10MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('dbType', dbType);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('AI extraction failed. Please try again.');

      const data = await response.json();
      sessionStorage.setItem('erdResults', JSON.stringify(data));
      router.push('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'System error occurred');
      setIsUploading(false);
    }
  }, [dbType, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <main className="min-h-screen bg-black text-[#EDEDED] font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* Background Glow Effect */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* ========================================= */}
      {/* NAVBAR */}
      {/* ========================================= */}
      <nav className="fixed top-0 z-50 flex items-center justify-between w-full px-6 py-5 border-b border-white/[0.05] bg-black/60 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Image src="/asset/logo.png" alt="Foundry Logo" width={32} height={32} className="object-contain" priority />
          <span className="text-xl font-bold tracking-tight text-white">Foundry</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05] text-sm font-medium text-gray-300">
            <Sparkles size={16} className="text-blue-400" /> Powered by IBM watsonx
          </div>
        </div>
      </nav>

      {/* ========================================= */}
      {/* HERO SECTION */}
      {/* ========================================= */}
      <div className="relative flex flex-col items-center justify-center px-4 pt-40 pb-20 text-center z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-sm font-semibold tracking-wide text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 rounded-full">
          <Terminal size={16} /> Foundry Engine v1.0
        </div>

        <h1 className="max-w-5xl mb-8 text-6xl font-extrabold tracking-tighter text-transparent md:text-8xl bg-clip-text bg-gradient-to-b from-white to-white/60 leading-tight">
          Diagram to Backend.<br />In 60 Seconds.
        </h1>

        <p className="max-w-3xl mb-14 text-xl text-gray-400 md:text-2xl leading-relaxed">
          Upload your ERD. Let AI forge your architecture. Get a complete, production-ready Node.js workspace with Prisma, Zod, Postman, and Docker instantly.
        </p>
      </div>

      {/* ========================================= */}
      {/* INTERACTIVE WORKSPACE (UPLOAD) */}
      {/* ========================================= */}
      <div className="relative container px-4 mx-auto max-w-5xl mb-32 z-10">
        
        {/* Segmented Control */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 bg-[#111] border border-white/[0.05] rounded-xl shadow-inner">
            {(['postgresql', 'mysql', 'sqlite'] as const).map((db) => (
              <button
                key={db}
                onClick={() => setDbType(db)}
                disabled={isUploading}
                className={`px-8 py-3 rounded-lg text-base font-semibold transition-all duration-200 ${
                  dbType === db
                    ? 'bg-[#222] text-white shadow-md border border-white/10'
                    : 'text-gray-500 hover:text-gray-300 transparent border border-transparent'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {db.charAt(0).toUpperCase() + db.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone Console */}
        <div className="relative bg-[#0A0A0A] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="p-3">
            {preview && !isUploading ? (
              <div className="p-6 space-y-6">
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center p-6 min-h-[400px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="ERD Preview" className="w-full h-auto object-contain max-h-[500px] opacity-90" />
                </div>
                <button
                  onClick={() => { setPreview(null); setError(null); }}
                  className="w-full py-4 px-6 text-lg font-bold bg-white text-black hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Upload Different Diagram
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`
                  relative border border-dashed rounded-xl p-20 text-center transition-all duration-300
                  ${isDragActive ? 'border-blue-500/50 bg-blue-500/[0.02]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.01]'}
                  ${isUploading ? 'opacity-50 cursor-not-allowed border-white/5' : 'cursor-pointer'}
                `}
              >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center justify-center gap-8">
                  {isUploading ? (
                    <div className="w-full max-w-lg mx-auto py-10">
                      <div className="relative w-20 h-20 mx-auto mb-10">
                        <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        <Image src="/asset/logo.png" alt="AI Engine" width={32} height={32} className="absolute inset-0 m-auto animate-pulse opacity-50" />
                      </div>
                      
                      <div className="space-y-3 mb-10">
                        <p className="text-xl font-medium text-white font-mono tracking-tight">{loadingMessage}</p>
                        <p className="text-base text-gray-500">Compiling 13 enterprise files. Do not close this tab.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm font-mono text-gray-500">
                          <span>SYSTEM_BUILD</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-white/[0.03] border border-white/[0.05] rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-10 h-10 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                      <div className="space-y-4">
                        <p className="text-3xl font-bold text-white tracking-tight">
                          {isDragActive ? 'Drop to compile' : 'Click or drag ERD here'}
                        </p>
                        <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
                          Supports Figma exports, Draw.io, Lucidchart, or high-quality photos of whiteboard sketches.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="border-t border-red-500/20 bg-red-500/10 p-5 flex items-center justify-center">
              <p className="text-base font-medium text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Tech Stack Footer */}
        <div className="flex flex-wrap items-center justify-center gap-10 mt-12 text-base font-semibold text-gray-500">
          <span className="flex items-center gap-2"><Database size={20}/> Prisma ORM</span>
          <span className="flex items-center gap-2"><Code2 size={20}/> TypeScript</span>
          <span className="flex items-center gap-2"><Box size={20}/> Docker</span>
          <span className="flex items-center gap-2"><Workflow size={20}/> CI/CD Actions</span>
        </div>
      </div>

      {/* ========================================= */}
      {/* FEATURES GRID */}
      {/* ========================================= */}
      <div className="container mx-auto px-4 max-w-6xl mb-32">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#0A0A0A] rounded-2xl p-10 border border-white/[0.05] hover:border-white/10 transition-colors">
            <Zap className="w-8 h-8 text-white mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">Zero Boilerplate</h3>
            <p className="text-base text-gray-400 leading-relaxed">
              We write the boring stuff. Get complete CRUD routes, Zod validations, and DB schemas instantly.
            </p>
          </div>
          <div className="bg-[#0A0A0A] rounded-2xl p-10 border border-white/[0.05] hover:border-white/10 transition-colors">
            <Image src="/asset/logo.png" alt="Vision" width={32} height={32} className="mb-6 opacity-80" />
            <h3 className="text-2xl font-bold text-white mb-3">Deterministic Vision</h3>
            <p className="text-base text-gray-400 leading-relaxed">
              Powered by watsonx.ai to intelligently map complex relationships, foreign keys, and constraints.
            </p>
          </div>
          <div className="bg-[#0A0A0A] rounded-2xl p-10 border border-white/[0.05] hover:border-white/10 transition-colors">
            <Rocket className="w-8 h-8 text-white mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">Deploy Ready</h3>
            <p className="text-base text-gray-400 leading-relaxed">
              Downloads as a clean `.zip` workspace. Includes Docker, GitHub Actions, and Faker seeds to start shipping.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* HOW IT WORKS (PIPELINE) */}
      {/* ========================================= */}
      <div className="border-t border-white/[0.05] bg-gradient-to-b from-[#050505] to-black py-32 relative">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-28">
            <h3 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tight mb-6">
              The AI Pipeline.
            </h3>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Bagaimana Foundry mengubah gambar menjadi arsitektur backend kelas produksi dalam 60 detik.
            </p>
          </div>

          <div className="relative ml-4 md:ml-0 md:pl-10">
            {/* Elegant Continuous Line */}
            <div className="absolute left-[27px] md:left-[43px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-blue-500 via-purple-500/50 to-transparent rounded-full" />

            <div className="space-y-24">
              {/* Pipeline Step 1 */}
              <div className="relative flex gap-10 group">
                <div className="relative z-10 w-14 h-14 rounded-full bg-black border-2 border-white/10 group-hover:border-blue-500 transition-colors duration-500 flex items-center justify-center shrink-0 shadow-lg">
                  <span className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">01</span>
                </div>
                <div className="pt-2">
                  <h4 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
                    Visual Architecture Analysis
                  </h4>
                  <p className="text-lg text-gray-400 leading-relaxed max-w-3xl">
                    Mesin <span className="text-gray-300">vision watsonx.ai</span> memindai diagram ERD Anda, secara instan mengenali setiap tabel, nama kolom, dan garis penghubung tanpa mempedulikan seberapa rumit resolusi gambar tersebut.
                  </p>
                </div>
              </div>

              {/* Pipeline Step 2 */}
              <div className="relative flex gap-10 group">
                <div className="relative z-10 w-14 h-14 rounded-full bg-black border-2 border-blue-500 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)] shrink-0">
                  <span className="text-lg font-bold text-blue-400">02</span>
                </div>
                <div className="pt-2">
                  <h4 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
                    Relational Logic Mapping
                  </h4>
                  <p className="text-lg text-gray-400 leading-relaxed max-w-3xl mb-6">
                    Bentuk visual diterjemahkan menjadi logika database yang ketat. AI merumuskan tipe data, <i>foreign keys</i>, dan relasi antar tabel (<i>one-to-many, many-to-many</i>) tanpa campur tangan manusia.
                  </p>
                  <div className="flex gap-3 font-mono text-sm text-gray-400">
                    <span className="px-4 py-2 bg-white/[0.03] rounded-md border border-white/10">Entity Recognition</span>
                    <span className="px-4 py-2 bg-white/[0.03] rounded-md border border-white/10">Foreign Key Linking</span>
                  </div>
                </div>
              </div>

              {/* Pipeline Step 3 */}
              <div className="relative flex gap-10 group">
                <div className="relative z-10 w-14 h-14 rounded-full bg-black border-2 border-white/10 group-hover:border-purple-500 transition-colors duration-500 flex items-center justify-center shrink-0 shadow-lg">
                  <span className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">03</span>
                </div>
                <div className="pt-2">
                  <h4 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
                    Enterprise Code Generation
                  </h4>
                  <p className="text-lg text-gray-400 leading-relaxed max-w-3xl">
                    Dalam hitungan detik, Foundry merakit ekosistem produksi secara utuh. Sistem menghasilkan bundel <span className="text-gray-300">13 file enterprise</span> yang berisi skema database, validasi Zod, rute API, hingga konfigurasi Docker siap deploy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* FOOTER */}
      {/* ========================================= */}
      <footer className="border-t border-white/[0.05] bg-black">
        <div className="container mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/asset/logo.png" alt="Foundry" width={24} height={24} className="opacity-50 grayscale" />
            <span className="text-base font-semibold text-gray-600">Foundry Engine</span>
          </div>
          <p className="text-sm text-gray-600 font-mono">
            © 2026 — Built for modern infrastructure.
          </p>
        </div>
      </footer>
    </main>
  );
}