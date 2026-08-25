import brandImage from '../assets/hero.png'

export function Brand({ compact = false, inverse = false, monochrome = false }) {
  return (
    <div className="flex items-center gap-3">
      <img
        className={`${compact ? 'h-8 w-8' : 'h-10 w-10'} object-contain ${monochrome ? 'grayscale' : ''}`}
        src={brandImage}
        alt=""
      />
      <span
        className={`text-lg font-extrabold ${inverse ? 'text-white' : 'text-zinc-950'}`}
      >
        Loveable
      </span>
    </div>
  )
}