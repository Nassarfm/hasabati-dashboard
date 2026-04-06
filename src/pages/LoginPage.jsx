import { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [mode,     setMode]     = useState('email')   // 'email' | 'username'
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'email') {
        await login(email, password)
      } else {
        // في المرحلة القادمة: سيُحوّل اسم المستخدم إلى بريد إلكتروني عبر API
        // مؤقتاً: نستخدم username@hasabati.local كصيغة داخلية
        await login(`${username}@hasabati.local`, password)
      }
    } catch (err) {
      setError(
        mode === 'email'
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : 'اسم المستخدم أو الرقم السري غير صحيح'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-600/10 blur-3xl"/>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl"/>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">ح</span>
          </div>
          <h1 className="text-white text-3xl font-bold">حساباتي</h1>
          <p className="text-primary-300 mt-1 text-sm">نظام المحاسبة والإدارة المتكامل</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-5">تسجيل الدخول</h2>

          {/* Toggle: طريقة الدخول */}
          <div className="flex rounded-xl overflow-hidden border border-white/20 mb-6">
            <button
              onClick={() => { setMode('email'); setError('') }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all
                ${mode==='email'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-white/50 hover:text-white/70'}`}>
              📧 البريد الإلكتروني
            </button>
            <button
              onClick={() => { setMode('username'); setError('') }}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all
                ${mode==='username'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-white/50 hover:text-white/70'}`}>
              👤 اسم المستخدم
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email Mode */}
            {mode === 'email' && (
              <div>
                <label className="block text-sm text-primary-200 mb-1.5 font-medium">
                  البريد الإلكتروني
                </label>
                <input type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"/>
              </div>
            )}

            {/* Username Mode */}
            {mode === 'username' && (
              <div>
                <label className="block text-sm text-primary-200 mb-1.5 font-medium">
                  اسم المستخدم
                </label>
                <input type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="مثال: accountant1 أو admin"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                  dir="ltr"/>
                {/* Role hint */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['admin','accountant','manager','viewer'].map(role => (
                    <button key={role} type="button"
                      onClick={() => setUsername(role)}
                      className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all font-mono">
                      {role}
                    </button>
                  ))}
                </div>
                <p className="text-white/30 text-xs mt-2">
                  * سيتم تفعيل الدخول بالاسم بشكل كامل في الإصدار القادم
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm text-primary-200 mb-1.5 font-medium">
                {mode === 'email' ? 'كلمة المرور' : 'الرقم السري'}
              </label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"/>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-200 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-400 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-60 mt-2">
              {loading ? '⏳ جارٍ الدخول...' : '← دخول'}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-white/20 text-xs text-center mt-6">
            حساباتي ERP v2.0 — جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  )
}
