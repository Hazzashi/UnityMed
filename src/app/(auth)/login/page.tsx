'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin]         = useState(true)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [message, setMessage]         = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null); setMessage(null)
    const supabase = createClient()

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message || JSON.stringify(signInError) || 'Erro ao entrar.')
        setLoading(false); return
      }
      router.refresh()
      router.push('/dashboard')
      return
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      })
      if (signUpError) {
        setError(signUpError.message || JSON.stringify(signUpError) || 'Erro ao criar conta.')
        setLoading(false); return
      }
      if (data.session) {
        router.refresh()
        router.push('/dashboard')
        return
      } else {
        setMessage('Conta criada! Verifique seu e-mail para confirmar.')
      }
    }
    setLoading(false)
  }

  return (
    /* Fundo bege — mesmo canvas do app */
    <div className="min-h-screen flex items-center justify-center bg-[#F4F3EF] dark:bg-[#181816] px-4">
      <div className="w-full max-w-sm space-y-7">

        {/* Brand */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-black dark:bg-[#F4F3EF] shadow-sm">
            <GraduationCap className="h-7 w-7 text-white dark:text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-[#F4F3EF]">UnityMed</h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
              Sua plataforma de produtividade acadêmica
            </p>
          </div>
        </div>

        {/* Card "ilha" */}
        <div className="rounded-[22px] bg-white dark:bg-[#181816] border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm p-7">
          <h2 className="text-lg font-semibold text-black dark:text-[#F4F3EF] mb-1">
            {isLogin ? 'Entrar' : 'Criar conta'}
          </h2>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-6">
            {isLogin ? 'Acesse seu espaço de estudo' : 'Comece sua jornada de aprendizado'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                E-mail
              </Label>
              <Input
                id="email" type="email" placeholder="seu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email"
                className="rounded-xl border-zinc-200/60 dark:border-zinc-700/60 bg-[#F4F3EF] dark:bg-[#181816] text-black dark:text-[#F4F3EF] placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="pr-10 rounded-xl border-zinc-200/60 dark:border-zinc-700/60 bg-[#F4F3EF] dark:bg-[#181816] text-black dark:text-[#F4F3EF] placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-[#F4F3EF]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2.5">
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-zinc-600 dark:text-zinc-300 bg-[#EAE8DF] dark:bg-[#2C2C27] rounded-xl px-3 py-2.5">
                {message}
              </p>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null) }}
              className="font-semibold text-black dark:text-[#F4F3EF] hover:underline underline-offset-4"
            >
              {isLogin ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
