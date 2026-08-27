import { memo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components = {
  p: (props) => <p className="my-2 first:mt-0 last:mb-0 leading-5" {...props} />,
  a: (props) => (
    <a
      className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-4 first:mt-0 last:mb-0" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-4 first:mt-0 last:mb-0" {...props} />,
  li: (props) => <li className="leading-5 marker:text-zinc-600" {...props} />,
  h1: (props) => <h1 className="mt-3 mb-1.5 text-sm font-extrabold text-zinc-100 first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-3 mb-1.5 text-[13px] font-extrabold text-zinc-100 first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-3 mb-1.5 text-xs font-extrabold text-zinc-100 first:mt-0" {...props} />,
  h4: (props) => <h4 className="mt-3 mb-1.5 text-xs font-bold text-zinc-200 first:mt-0" {...props} />,
  strong: (props) => <strong className="font-extrabold text-zinc-100" {...props} />,
  em: (props) => <em className="italic text-zinc-200" {...props} />,
  hr: () => <hr className="my-3 border-white/8" />,
  blockquote: (props) => (
    <blockquote className="my-2 border-l-2 border-cyan-500/40 pl-3 text-zinc-400 italic" {...props} />
  ),
  code: ({ children, ...props }) => (
    <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[11px] text-cyan-300" {...props}>
      {children}
    </code>
  ),
  // react-markdown v10 wraps fenced blocks in `pre`, so the block chrome lives here.
  pre: ({ children }) => {
    const codeNode = Array.isArray(children) ? children[0] : children
    const language = /language-(\w+)/.exec(codeNode?.props?.className || '')?.[1]

    return (
      <div className="my-2 overflow-hidden rounded-md border border-white/8 bg-[#0d0d12] first:mt-0 last:mb-0">
        {language && (
          <div className="border-b border-white/8 px-2.5 py-1 font-mono text-[9px] font-bold tracking-wide text-zinc-500 uppercase">
            {language}
          </div>
        )}
        <pre className="ide-scroll overflow-x-auto px-2.5 py-2 font-mono text-[11px] leading-[18px] text-zinc-300">
          <code>{codeNode?.props?.children}</code>
        </pre>
      </div>
    )
  },
  table: (props) => (
    <span className="ide-scroll my-2 block overflow-x-auto first:mt-0 last:mb-0">
      <table className="w-full border-collapse text-[11px]" {...props} />
    </span>
  ),
  th: (props) => (
    <th className="border border-white/8 bg-white/5 px-2 py-1 text-left font-bold text-zinc-200" {...props} />
  ),
  td: (props) => <td className="border border-white/8 px-2 py-1 align-top text-zinc-300" {...props} />,
}

/** Renders assistant prose. Input is model output, so raw HTML stays disabled. */
export const MarkdownMessage = memo(function MarkdownMessage({ content }) {
  return (
    <div className="text-xs font-medium break-words text-zinc-300">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  )
})
