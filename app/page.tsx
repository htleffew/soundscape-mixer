import { Layers } from "lucide-react";
import MixerEditor from "@/components/MixerEditor";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050508] text-[#E0E0E6] flex flex-col font-sans overflow-x-hidden">
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[#0B0B14] border-b border-[#1F1F2E] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              <div className="w-1 h-4 bg-white rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight uppercase text-white">Audio <span className="text-cyan-400">Layerer</span></h1>
              <p className="text-[10px] text-[#8F8FA3] uppercase tracking-widest hidden sm:block">Design your perfect soundscape</p>
            </div>
          </div>
        </div>
      </header>

      <section className="flex-1 w-full p-4 sm:p-8">
        <MixerEditor />
      </section>
    </main>
  );
}
