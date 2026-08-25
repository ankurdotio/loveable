import { useState } from 'react'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/auth-context.js'
import brandImage from '../assets/hero.png'
import { Brand } from '../components/Brand.jsx'

const fieldClass =
  'h-12 w-full rounded-md border border-zinc-200 bg-white pl-11 pr-4 text-sm font-semibold text-zinc-900 outline-none transition placeholder:font-medium placeholder:text-zinc-400 focus:border-[#6e45ff] focus:ring-3 focus:ring-[#6e45ff]/10'

export function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)

    try {
      const credentials = {
        email: form.get('email'),
        password: form.get('password'),
      }

      if (isRegister) {
        await register({ ...credentials, name: form.get('name') })
      } else {
        await login(credentials)
      }

      navigate('/projects', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Unable to continue. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh bg-[#f4f5f7] lg:grid lg:grid-cols-[minmax(360px,0.82fr)_1.18fr]">
      <section className="auth-visual relative hidden min-h-svh overflow-hidden bg-[#111116] p-10 text-white lg:flex lg:flex-col">
        <Brand inverse />
        <div className="relative z-10 my-auto max-w-lg py-16">
          <img
            src={brandImage}
            alt="Layered Loveable workspace mark"
            className="mb-10 h-44 w-44 object-contain drop-shadow-[0_28px_48px_rgba(109,69,255,0.35)]"
          />
          <p className="mb-4 text-xs font-bold uppercase text-[#a892ff]">
            One focused workspace
          </p>
          <h1 className="max-w-md text-4xl leading-[1.08] font-extrabold">
            Move from idea to running code without losing context.
          </h1>
          <div className="mt-9 grid gap-4 text-sm font-semibold text-zinc-300">
            {['Live project previews', 'A real editor and file system', 'AI conversations per project'].map(
              (feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-[#6e45ff]/20 text-[#b7a7ff]">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {feature}
                </div>
              ),
            )}
          </div>
        </div>
        <p className="relative z-10 text-xs font-semibold text-zinc-500">
          Built for uninterrupted product work.
        </p>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <p className="mb-3 text-xs font-extrabold uppercase text-[#6e45ff]">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950">
            {isRegister ? 'Start building today' : 'Sign in to your workspace'}
          </h2>
          <p className="mt-3 text-sm leading-6 font-medium text-zinc-500">
            {isRegister
              ? 'Set up your workspace in less than a minute.'
              : 'Your projects are waiting right where you left them.'}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-zinc-700">Name</span>
                <span className="relative block">
                  <UserRound className="absolute top-3.5 left-3.5 size-5 text-zinc-400" />
                  <input
                    className={fieldClass}
                    name="name"
                    type="text"
                    autoComplete="name"
                    minLength={2}
                    placeholder="Your name"
                    required
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-zinc-700">Email</span>
              <span className="relative block">
                <Mail className="absolute top-3.5 left-3.5 size-5 text-zinc-400" />
                <input
                  className={fieldClass}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-zinc-700">Password</span>
              <span className="relative block">
                <LockKeyhole className="absolute top-3.5 left-3.5 size-5 text-zinc-400" />
                <input
                  className={`${fieldClass} pr-12`}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  minLength={8}
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  className="absolute top-3 right-3 grid size-7 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#6e45ff] px-5 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(110,69,255,0.24)] transition hover:bg-[#5e38eb] disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm font-medium text-zinc-500">
            {isRegister ? 'Already have an account?' : 'New to Loveable?'}{' '}
            <Link
              className="font-extrabold text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-[#6e45ff]"
              to={isRegister ? '/login' : '/register'}
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}