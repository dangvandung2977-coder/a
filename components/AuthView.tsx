'use client';

import React, { useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { getRememberSession, setRememberSession } from '@/lib/authStorage';
import AppBrand from '@/components/AppBrand';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  TrendingUp,
  Weight,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
type FieldErrors = { email?: string; password?: string };

function authError(error: { message: string; code?: string }) {
  switch (error.code) {
    case 'invalid_credentials': return 'Email hoặc mật khẩu không chính xác.';
    case 'email_not_confirmed': return 'Vui lòng xác nhận email trước khi đăng nhập.';
    case 'user_already_exists': return 'Email này đã được đăng ký. Vui lòng đăng nhập.';
    case 'weak_password': return 'Mật khẩu chưa đủ mạnh. Hãy thử mật khẩu khác.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
    default: return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại sau.';
  }
}

export default function AuthView({ onAuthSuccess, passwordRecovery = false }: {
  onAuthSuccess: () => void;
  passwordRecovery?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMode, setMode] = useState<AuthMode>('login');
  const mode = passwordRecovery ? 'reset' : selectedMode;
  const isSignUp = mode === 'register';
  const isRecovery = mode === 'forgot' || mode === 'reset';
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(getRememberSession);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<{ text: string; success?: boolean } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const busy = loading || googleLoading;

  const changeMode = (next: AuthMode) => {
    if (busy) return;
    setMode(next);
    setErrors({});
    setNotice(null);
    setShowPassword(false);
    setPassword('');
  };

  const validateEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? undefined : 'Email không hợp lệ';
  // Existing members can still sign in with passwords shorter than eight characters.
  const validatePassword = () => !password ? 'Vui lòng nhập mật khẩu'
    : (isSignUp || mode === 'reset') && password.length < 8
      ? 'Mật khẩu phải có ít nhất 8 ký tự' : undefined;

  const configurationReady = () => {
    if (isSupabaseConfigured) return true;
    setNotice({ text: 'Dịch vụ đăng nhập chưa được cấu hình. Vui lòng thử lại sau.' });
    return false;
  };

  // Đăng nhập / Đăng ký Email
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setNotice(null);
    const nextErrors = {
      email: mode === 'reset' ? undefined : validateEmail(),
      password: mode === 'forgot' ? undefined : validatePassword(),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    if (!configurationReady()) return;
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/?auth=recovery`,
        });
        if (error) setNotice({ text: authError(error) });
        else setNotice({ text: 'Nếu email đã được đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.', success: true });
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setNotice({ text: authError(error) });
        else onAuthSuccess();
      } else {
        setRememberSession(remember);
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
          if (error) setNotice({ text: authError(error) });
          else if (data.user && data.session) {
            setTempUserId(data.user.id);
            setShowOnboarding(true);
          } else if (data.user) {
            setNotice({ text: 'Vui lòng kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.', success: true });
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (error) setNotice({ text: authError(error) });
          else onAuthSuccess();
        }
      }
    } catch {
      setNotice({ text: 'Không thể kết nối. Kiểm tra kết nối mạng và thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập Google
  const handleGoogleLogin = async () => {
    if (busy) return;
    setNotice(null);
    if (!configurationReady()) return;
    setRememberSession(remember);
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) setNotice({ text: authError(error) });
    } catch {
      setNotice({ text: 'Không thể kết nối với Google. Vui lòng thử lại.' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Lưu lựa chọn Onboarding tạ lẻ
  const handleSelectMicroplates = async (hasMicroplates: boolean) => {
    if (!tempUserId || loading) return;
    setLoading(true);
    setNotice(null);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: tempUserId,
        email: email.trim(),
        has_microplates: hasMicroplates
      });
      if (error) setNotice({ text: 'Không thể lưu lựa chọn. Vui lòng thử lại.' });
      else onAuthSuccess();
    } catch {
      setNotice({ text: 'Không thể kết nối. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  if (showOnboarding) {
    return (
      <main className="app-screen relative min-h-screen overflow-hidden">
        <div className="onboarding-shell relative max-w-md mx-auto min-h-screen px-6 py-8 flex flex-col">
          <AppBrand />
          <div className="flex items-center gap-2 mt-7 mb-10">
            <span className="h-1 flex-1 rounded-full bg-lime-400" />
            <span className="h-1 flex-1 rounded-full bg-lime-400" />
            <span className="text-[11px] font-bold tracking-widest text-zinc-500 ml-2">2/2</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="w-14 h-14 bg-lime-400/10 border border-lime-400/20 text-lime-400 rounded-2xl flex items-center justify-center mb-6">
              <Weight className="w-7 h-7" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime-400 mb-2">
              Thiết lập phòng tập
            </p>
            <h1 className="text-3xl font-black tracking-tight text-balance leading-tight mb-3">
              Phòng tập của bạn có tạ lẻ không?
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8 text-pretty">
              Bánh tạ <span className="text-white font-semibold">0.5kg, 1kg, 1.25kg</span> hoặc tạ đơn cách nhau 1-2kg.
              Thông tin này giúp thuật toán tính mức tăng tạ chính xác cho bạn.
            </p>

            <div className="flex flex-col gap-3">
              <button
                disabled={loading}
                onClick={() => handleSelectMicroplates(true)}
                className="group w-full text-left bg-zinc-900 hover:bg-zinc-900/60 border border-zinc-800 hover:border-lime-400/50 rounded-2xl p-5 flex items-center gap-4 transition-all active:scale-[0.98]"
              >
                <span className="w-11 h-11 rounded-xl bg-lime-400 text-zinc-950 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block font-black text-base">Có tạ lẻ nhỏ</span>
                  <span className="block text-xs text-zinc-500 mt-0.5">Tăng tiến mượt, bước nhảy nhỏ</span>
                </span>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-lime-400 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
              </button>

              <button
                disabled={loading}
                onClick={() => handleSelectMicroplates(false)}
                className="group w-full text-left bg-zinc-900 hover:bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 flex items-center gap-4 transition-all active:scale-[0.98]"
              >
                <span className="w-11 h-11 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block font-black text-base">Không, toàn tạ to</span>
                  <span className="block text-xs text-zinc-500 mt-0.5">Ưu tiên tăng số rep trước khi tăng tạ</span>
                </span>
                <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p className="auth-notice" role="status" aria-live="polite">{loading ? 'Đang lưu lựa chọn...' : notice?.text}</p>
          <p className="text-center text-xs text-zinc-600 mt-8">Bạn có thể thay đổi lựa chọn này sau.</p>
        </div>
      </main>
    );
  }

  const primaryText = mode === 'forgot' ? 'GỬI LIÊN KẾT KHÔI PHỤC'
    : mode === 'reset' ? 'LƯU MẬT KHẨU MỚI' : isSignUp ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP';
  const pendingText = mode === 'forgot' ? 'ĐANG GỬI...'
    : mode === 'reset' ? 'ĐANG LƯU...' : isSignUp ? 'ĐANG ĐĂNG KÝ...' : 'ĐANG ĐĂNG NHẬP...';
  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || busy) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register'
      : isSignUp ? 'login' : 'register';
    changeMode(next);
    document.getElementById(`auth-tab-${next}`)?.focus();
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <header className="auth-brand">
          <div className="auth-brand-row">
            <h1>GYM<br /><span>PROGRESSION</span></h1>
            <div className="auth-mark" aria-hidden="true"><Activity size={23} strokeWidth={2} /></div>
          </div>
          <p><TrendingUp size={15} aria-hidden="true" />Tập khoa học. Tiến bộ mỗi ngày.</p>
        </header>

        {isRecovery ? (
          <div className="auth-recovery-heading">
            <button type="button" className="auth-back" aria-label="Quay lại đăng nhập" disabled={busy}
              onClick={() => passwordRecovery ? onAuthSuccess() : changeMode('login')}>
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
            <h2>{mode === 'reset' ? 'Đặt mật khẩu mới' : 'Khôi phục mật khẩu'}</h2>
          </div>
        ) : (
          <div className="auth-tabs" role="tablist" aria-label="Đăng nhập hoặc đăng ký">
            <span className={`auth-tab-indicator ${isSignUp ? 'is-register' : ''}`} aria-hidden="true" />
            {(['login', 'register'] as const).map((tabMode) => (
              <button key={tabMode} id={`auth-tab-${tabMode}`} type="button" role="tab"
                aria-selected={mode === tabMode} aria-controls="auth-panel"
                tabIndex={mode === tabMode ? 0 : -1} disabled={busy}
                onKeyDown={handleTabKey} onClick={() => changeMode(tabMode)}>
                {tabMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>
        )}

        <div id="auth-panel" role={isRecovery ? undefined : 'tabpanel'}
          aria-labelledby={isRecovery ? undefined : `auth-tab-${mode}`}>
          <form onSubmit={handleAuth} noValidate aria-busy={loading}>
            <div className="auth-fields" key={mode}>
              {isRecovery && <p className="auth-recovery-copy">
                {mode === 'reset' ? 'Chọn mật khẩu mới có ít nhất 8 ký tự cho tài khoản của bạn.'
                  : 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu.'}
              </p>}
              {mode !== 'reset' && <div className="auth-field">
                <label htmlFor="auth-email">Email</label>
                <div className={`auth-input-wrap ${errors.email ? 'has-error' : ''}`}>
                  <Mail size={18} className="auth-input-icon" aria-hidden="true" />
                  <input ref={emailRef} id="auth-email" name="email" type="email"
                    placeholder="example@email.com" value={email} required autoComplete="email"
                    autoCapitalize="none" spellCheck={false} disabled={busy}
                    aria-invalid={Boolean(errors.email)} aria-describedby="auth-email-error"
                    onBlur={() => setErrors((current) => ({ ...current, email: email ? validateEmail() : current.email }))}
                    onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: undefined })); setNotice(null); }} />
                </div>
                <p className="auth-field-error" id="auth-email-error" aria-live="polite">
                  {errors.email && <><AlertCircle size={13} aria-hidden="true" />{errors.email}</>}
                </p>
              </div>}
              {mode !== 'forgot' && <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="auth-password">{mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}</label>
                  {mode === 'login' && <button type="button" className="auth-text-link" disabled={busy}
                    onClick={() => changeMode('forgot')}>Quên mật khẩu?</button>}
                </div>
                <div className={`auth-input-wrap ${errors.password ? 'has-error' : ''}`}>
                  <Lock size={18} className="auth-input-icon" aria-hidden="true" />
                  <input ref={passwordRef} id="auth-password" name="password" required
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isSignUp || mode === 'reset' ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu của bạn'}
                    value={password} disabled={busy}
                    autoComplete={isSignUp || mode === 'reset' ? 'new-password' : 'current-password'}
                    aria-invalid={Boolean(errors.password)} aria-describedby="auth-password-error"
                    onBlur={() => setErrors((current) => ({ ...current, password: password ? validatePassword() : current.password }))}
                    onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined })); setNotice(null); }} />
                  <button type="button" className="auth-password-toggle" disabled={busy}
                    onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                <p className="auth-field-error" id="auth-password-error" aria-live="polite">
                  {errors.password && <><AlertCircle size={13} aria-hidden="true" />{errors.password}</>}
                </p>
              </div>}
            </div>
            {!isRecovery && <div className="auth-options">
              <label className="auth-remember">
                <input type="checkbox" checked={remember} disabled={busy}
                  onChange={(event) => setRemember(event.target.checked)} />
                <span className="auth-checkbox" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                Ghi nhớ đăng nhập
              </label>
            </div>}
            <button type="submit" className="auth-primary" disabled={busy}>
              {loading && <Loader2 size={19} className="auth-spinner" aria-hidden="true" />}
              <span>{loading ? pendingText : primaryText}</span>
              {!loading && <ArrowRight size={19} aria-hidden="true" />}
            </button>
          </form>
        </div>
        {!isRecovery && <>
          <div className="auth-divider" aria-hidden="true"><span />HOẶC<span /></div>
          <button type="button" className="auth-google" disabled={busy} onClick={handleGoogleLogin}>
            {googleLoading ? <Loader2 size={20} className="auth-spinner" aria-hidden="true" /> :
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>}
            {googleLoading ? 'Đang kết nối với Google...' : 'Tiếp tục với Google'}
          </button>
          <p className="auth-footer">
            {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <button type="button" className="auth-text-link" disabled={busy}
              onClick={() => { changeMode(isSignUp ? 'login' : 'register'); document.getElementById(`auth-tab-${isSignUp ? 'login' : 'register'}`)?.focus(); }}>
              {isSignUp ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
            </button>
          </p>
        </>}
        <div className={`auth-notice ${notice?.success ? 'is-success' : ''}`} role="status" aria-live="polite" aria-atomic="true">
          {notice && <>{notice.success ? <Check size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}<span>{notice.text}</span></>}
        </div>
      </div>
    </main>
  );
}
