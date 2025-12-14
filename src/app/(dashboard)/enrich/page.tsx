import { Sparkles } from 'lucide-react';

export default function EnrichPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <Sparkles className="mb-4 h-12 w-12 text-gold-primary" />
      <h1 className="mb-2 text-[28px] font-bold text-white">Enrichment Queue</h1>
      <p className="text-text-tertiary">No contacts need enrichment right now</p>
    </div>
  );
}
