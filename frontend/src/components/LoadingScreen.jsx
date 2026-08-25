import { LoaderCircle } from 'lucide-react'
import { Brand } from './Brand.jsx'

export function LoadingScreen({ label = 'Loading' }) {
  return (
    <main className="grid min-h-svh place-items-center bg-[#f5f6f8] text-zinc-900">
      <div className="flex flex-col items-center gap-5">
        <Brand />
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
          <LoaderCircle className="size-4 animate-spin text-cyan-600" />
          {label}
        </div>
      </div>
    </main>
  )
}