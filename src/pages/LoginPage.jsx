 import { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">ح</span>
          </div>
          <h1 className="text-white text-3xl font-bold">حساباتي</h1>
          <p className="text-primary-300 mt-1 text-sm">نظام المحاسبة والإدارة المتكامل</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-6">تسجيل الدخول</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-primary-200 mb-1.5 font-medium">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@hasabati.com" required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all" />
            </div>
            <div>
              <label className="block text-sm text-primary-200 mb-1.5 font-medium">كلمة المرور</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all" />
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-200 text-sm">
                ⚠️ {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-400 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-60 mt-2">
              {loading ? '⏳ جاري الدخول...' : 'دخول'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-white/40 text-xs text-center mb-3">حسابات تجريبية</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'مدير', email: 'admin@hasabati.com' },
                { label: 'محاسب', email: 'accountant@hasabati.com' },
              ].map(acc => (
                <button key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword('hasabati123') }}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-white/60 hover:text-white/80 transition-all text-right">
                  {acc.label}
                  <span className="block text-white/30 text-[10px] mt-0.5 truncate">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
