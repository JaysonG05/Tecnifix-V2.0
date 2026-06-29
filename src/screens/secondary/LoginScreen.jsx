import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { TechnicianCard } from '../../components/TechnicianCard.jsx'
import {
  Avatar, StarRating, Badge, Btn, Input, Toggle, SkeletonCard,
  EmptyState, Modal, Toast, PageHeader, SettingsRow, StatusBadge, Spinner
} from '../../components/UI.jsx'
import {
  supabase, auth, profiles, technicians, techCategories, certificatesApi, serviceCatalog, favorites as favApi,
  serviceRequests, archiveApi, receiptsApi, admin, notifications
} from '../../lib/supabase.js'
import { T } from '../../i18n/translations.js'
import { receiptActions, disputeActions } from '../../lib/payments.js'

export function LoginScreen() {
  const { th, navigate, refreshUser, lang, setUser } = useApp()
  const t = T[lang]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [sliderActive, setSliderActive] = useState(false)

  const goRegister = () => {
    setSliderActive(true)
    window.setTimeout(() => navigate('register'), 520)
  }

  const profileFromAuth = (authUser) => ({
    id: authUser.id,
    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario Tecnifix',
    email: authUser.email,
    role: authUser.user_metadata?.role || 'user',
    avatar_url: authUser.user_metadata?.avatar_url || null,
  })

  const afterAuthRedirect = async (authUser, profile) => {
    if (!authUser?.id) throw new Error('No se pudo leer la sesión del usuario.')
    const safeProfile = profile || profileFromAuth(authUser)
    setUser(safeProfile)

    try {
      const role = safeProfile?.role || authUser?.user_metadata?.role
      if (role === 'technician') {
        navigate('profile')
        return
      }
      if (role === 'admin') {
        navigate('admin')
        return
      }
    } catch { /* si falla, seguimos a home */ }
    navigate('home')
  }

  const handleLogin = async () => {
    if (!email || !password) { setError('Completa todos los campos.'); return }
    setLoading(true); setError('')
    try {
      const loginData = await auth.signIn({ email: email.trim(), password })
      const authUser = loginData?.user || await auth.getUser()
      const profile = authUser?.id ? await profiles.ensureFromAuth(authUser).catch(() => profileFromAuth(authUser)) : null
      await afterAuthRedirect(authUser, profile)
    } catch (err) {
      const msg = String(err?.message || '')
      if (msg.toLowerCase().includes('invalid login')) setError('Correo o contraseña incorrectos.')
      else if (msg.toLowerCase().includes('email not confirmed')) setError('Confirma tu correo antes de iniciar sesión.')
      else setError(`No pude iniciar sesión: ${msg || t.wrongCredentials}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true); setError('')
    try {
      await auth.signInWithGoogle()
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar con Google. Revisa la configuración OAuth en Supabase.')
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!email) { setError('Ingresa tu email.'); return }
    setLoading(true); setError('')
    try {
      await auth.resetPassword(email.trim())
      setResetSent(true)
    } catch {
      setError('Error al enviar. Verifica el email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tf-slider-page">
      <style>{authFormCss}</style>
      <button className="tf-slider-home" onClick={() => navigate('home')} aria-label="Ir al inicio">
        TECNI<span>FIX</span>
      </button>
      <div className={`tf-slider-container ${sliderActive ? 'right-panel-active' : ''}`} id="container">
        <div className="form-container sign-up-container">
          <form onSubmit={(e) => { e.preventDefault(); goRegister() }}>
            <h1>Crear cuenta</h1>
            <div className="social-container">
              <button type="button" className="social">f</button>
              <button type="button" className="social" onClick={handleGoogle}>G</button>
              <button type="button" className="social">in</button>
              <button type="button" className="social">⌘</button>
            </div>
            <span>Regístrate como cliente o técnico verificado</span>
            <input type="text" placeholder="Nombre" readOnly />
            <input type="email" placeholder="Correo electrónico" readOnly />
            <input type="password" placeholder="Contraseña" readOnly />
            <button type="submit" className="tf-slider-main-btn">Crear cuenta</button>
          </form>
        </div>

        <div className="form-container sign-in-container">
          <form onSubmit={(e) => { e.preventDefault(); resetMode ? handleReset() : handleLogin() }}>
            {resetSent ? (
              <div className="tf-slider-reset-done">
                <div>📧</div>
                <p>{t.resetSent}</p>
                <button type="button" onClick={() => { setResetMode(false); setResetSent(false) }}>Volver al login</button>
              </div>
            ) : (
              <>
                <h1>{resetMode ? 'Recuperar acceso' : 'Iniciar sesión'}</h1>
                {!resetMode && <div className="social-container">
                  <button type="button" className="social">f</button>
                  <button type="button" className="social" onClick={handleGoogle}>G</button>
                  <button type="button" className="social">in</button>
                  <button type="button" className="social">⌘</button>
                </div>}
                <span>{resetMode ? 'Usa tu correo para recuperar acceso' : 'o usa tu correo y contraseña'}</span>

                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (resetMode ? handleReset() : handleLogin())}
                  placeholder="Correo electrónico"
                  type="email"
                  autoComplete="email"
                />

                {!resetMode && (
                  <div className="tf-slider-password">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      placeholder="Contraseña"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}>{showPass ? 'Ocultar' : 'Ver'}</button>
                  </div>
                )}

                {!resetMode && <button type="button" className="tf-slider-link" onClick={() => { setResetMode(true); setError('') }}>{t.forgotPassword}</button>}
                {error && <p className="tf-slider-error">{error}</p>}

                <button type="submit" className="tf-slider-main-btn" disabled={loading}>
                  {loading ? 'Procesando...' : resetMode ? 'Enviar recuperación' : 'Iniciar sesión'}
                </button>

                <button
                  type="button"
                  className="tf-slider-mobile-switch"
                  onClick={() => {
                    setError('')
                    if (resetMode) setResetMode(false)
                    else goRegister()
                  }}
                >
                  {resetMode ? '← Volver al login' : 'Soy técnico: crear cuenta y verificarme'}
                </button>
              </>
            )}
          </form>
        </div>

        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>¡Bienvenido de vuelta!</h1>
              <p>Inicia sesión para continuar con tus servicios, solicitudes y verificación.</p>
              <button type="button" className="ghost" onClick={() => setSliderActive(false)}>Iniciar sesión</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>¿Nuevo en Tecnifix?</h1>
              <p>Crea tu cuenta. Si eres técnico, después completas tu verificación para que el dueño pueda aprobarte.</p>
              <button type="button" className="ghost" onClick={goRegister}>Crear cuenta</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const authFormCss = `
  .tf-slider-page{
    min-height:100dvh;
    background:
      radial-gradient(circle at 18% 12%, rgba(248,219,19,.18), transparent 24%),
      radial-gradient(circle at 88% 82%, rgba(96,165,250,.42), transparent 30%),
      linear-gradient(135deg,#0b2340 0%,#194fba 52%,#2563eb 100%);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:24px;
    position:relative;
    overflow:auto;
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  }
  .tf-slider-home{
    position:fixed;
    top:24px;
    left:28px;
    z-index:5;
    border:0;
    border-radius:999px;
    background:#f8db13;
    color:#10233e;
    padding:11px 22px;
    font-weight:950;
    font-style:italic;
    letter-spacing:0;
    cursor:pointer;
    box-shadow:0 16px 34px rgba(248,219,19,.24);
  }
  .tf-slider-home span{ color:#2563eb; }
  .tf-slider-container{
    background:#fff;
    border-radius:20px;
    box-shadow:0 24px 54px rgba(2,15,39,.28);
    position:relative;
    overflow:hidden;
    width:min(920px,100%);
    min-height:560px;
  }
  .tf-slider-container h1{
    font-weight:950;
    margin:0;
    color:#10233e;
    letter-spacing:0;
  }
  .tf-slider-container p{
    font-size:14px;
    font-weight:600;
    line-height:1.5;
    letter-spacing:0;
    margin:20px 0 30px;
  }
  .tf-slider-container span{
    font-size:12px;
    color:#64748b;
    font-weight:800;
    margin-bottom:8px;
  }
  .tf-slider-container form{
    background:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
    padding:0 48px;
    height:100%;
    text-align:center;
  }
  .tf-slider-container input{
    background:#eef4ff;
    border:1px solid #dbeafe;
    border-radius:12px;
    padding:13px 15px;
    margin:8px 0;
    width:100%;
    color:#10233e;
    font-weight:800;
    outline:none;
  }
  .tf-slider-container input:focus{
    border-color:#2563eb;
    box-shadow:0 0 0 4px rgba(37,99,235,.13);
    background:#fff;
  }
  .tf-slider-main-btn,
  .tf-slider-container button.ghost{
    border-radius:999px;
    border:1px solid #2563eb;
    background:#2563eb;
    color:#fff;
    font-size:12px;
    font-weight:950;
    padding:12px 34px;
    letter-spacing:.08em;
    text-transform:uppercase;
    transition:transform 80ms ease-in, opacity .18s ease, box-shadow .18s ease;
    cursor:pointer;
    box-shadow:0 12px 24px rgba(37,99,235,.22);
  }
  .tf-slider-main-btn:active,
  .tf-slider-container button.ghost:active{ transform:scale(.95); }
  .tf-slider-main-btn:disabled{ opacity:.65; cursor:not-allowed; }
  .tf-slider-container button.ghost{
    background:transparent;
    border-color:#fff;
    box-shadow:none;
  }
  .form-container{
    position:absolute;
    top:0;
    height:100%;
    transition:all .6s ease-in-out;
  }
  .sign-in-container{
    left:0;
    width:50%;
    z-index:2;
  }
  .tf-slider-container.right-panel-active .sign-in-container{
    transform:translateX(100%);
  }
  .sign-up-container{
    left:0;
    width:50%;
    opacity:0;
    z-index:1;
  }
  .tf-slider-container.right-panel-active .sign-up-container{
    transform:translateX(100%);
    opacity:1;
    z-index:5;
    animation:tf-slider-show .6s;
  }
  @keyframes tf-slider-show{
    0%,49.99%{ opacity:0; z-index:1; }
    50%,100%{ opacity:1; z-index:5; }
  }
  .overlay-container{
    position:absolute;
    top:0;
    left:50%;
    width:50%;
    height:100%;
    overflow:hidden;
    transition:transform .6s ease-in-out;
    z-index:100;
  }
  .tf-slider-container.right-panel-active .overlay-container{
    transform:translateX(-100%);
  }
  .overlay{
    background:#136ffa;
    background:linear-gradient(to right,#014edf,#3996ff);
    background-repeat:no-repeat;
    background-size:cover;
    background-position:0 0;
    color:#fff;
    position:relative;
    left:-100%;
    height:100%;
    width:200%;
    transform:translateX(0);
    transition:transform .6s ease-in-out;
  }
  .overlay::before{
    content:'';
    position:absolute;
    inset:0;
    background:
      radial-gradient(circle at 20% 28%, rgba(248,219,19,.28), transparent 20%),
      radial-gradient(circle at 82% 70%, rgba(255,255,255,.18), transparent 24%);
    pointer-events:none;
  }
  .tf-slider-container.right-panel-active .overlay{
    transform:translateX(50%);
  }
  .overlay-panel{
    position:absolute;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
    padding:0 42px;
    text-align:center;
    top:0;
    height:100%;
    width:50%;
    transform:translateX(0);
    transition:transform .6s ease-in-out;
  }
  .overlay-panel h1{ color:#fff; font-size:32px; }
  .overlay-panel p{ color:rgba(255,255,255,.88); }
  .overlay-left{ transform:translateX(-20%); }
  .tf-slider-container.right-panel-active .overlay-left{ transform:translateX(0); }
  .overlay-right{ right:0; transform:translateX(0); }
  .tf-slider-container.right-panel-active .overlay-right{ transform:translateX(20%); }
  .social-container{
    margin:20px 0;
    display:flex;
    justify-content:center;
    gap:10px;
  }
  .social-container .social{
    border:1px solid #dbeafe;
    background:#fff;
    border-radius:50%;
    display:inline-flex;
    justify-content:center;
    align-items:center;
    height:40px;
    width:40px;
    color:#2563eb;
    font-weight:950;
    cursor:pointer;
    box-shadow:0 8px 18px rgba(37,99,235,.08);
    padding:0;
    text-transform:none;
    letter-spacing:0;
  }
  .tf-slider-password{
    width:100%;
    position:relative;
  }
  .tf-slider-password input{ padding-right:78px; }
  .tf-slider-password button{
    position:absolute;
    right:10px;
    top:50%;
    transform:translateY(-50%);
    border:0;
    border-radius:9px;
    background:#dbeafe;
    color:#2563eb;
    padding:7px 10px;
    font-size:12px;
    font-weight:900;
    cursor:pointer;
  }
  .tf-slider-link,
  .tf-slider-mobile-switch{
    border:0;
    background:transparent;
    color:#2563eb;
    font-size:13px;
    font-weight:900;
    margin:10px 0 14px;
    cursor:pointer;
  }
  .tf-slider-error{
    width:100%;
    margin:4px 0 12px;
    background:#fef2f2;
    border:1px solid #fecaca;
    color:#b91c1c;
    border-radius:12px;
    padding:10px;
    font-size:12px;
    font-weight:800;
  }
  .tf-slider-reset-done div{ font-size:48px; margin-bottom:10px; }
  .tf-slider-reset-done p{ color:#64748b; margin:0 0 18px; }
  @media (max-width:760px){
    .tf-slider-page{ padding:0; }
    .tf-slider-home{ position:absolute; top:16px; left:16px; }
    .tf-slider-container{
      width:100%;
      min-height:100dvh;
      border-radius:0;
      box-shadow:none;
    }
    .overlay-container{ display:none; }
    .form-container{
      position:relative;
      width:100%;
      height:auto;
      min-height:100dvh;
      opacity:1;
      transform:none !important;
    }
    .sign-up-container{ display:none; }
    .sign-in-container{ width:100%; }
    .tf-slider-container form{ padding:86px 24px 36px; }
    .tf-slider-mobile-switch{ display:block; }
  }
  @media (min-width:761px){
    .tf-slider-mobile-switch{ display:none; }
  }

  .tf-login-page{
    min-height:100dvh;
    box-sizing:border-box;
    padding:clamp(14px,2.4vw,30px);
    background:
      radial-gradient(circle at 18% 18%, rgba(248,219,19,.22), transparent 25%),
      radial-gradient(circle at 82% 75%, rgba(96,165,250,.45), transparent 28%),
      linear-gradient(135deg,#0b2340 0%,#194fba 52%,#2563eb 100%);
    display:flex;
    align-items:center;
    justify-content:center;
    overflow:auto;
  }
  .tf-login-shell{
    width:min(1180px,100%);
    height:clamp(620px,calc(100dvh - 42px),720px);
    background:#fff;
    border-radius:24px;
    box-shadow:0 38px 90px rgba(2,15,39,.34);
    overflow:hidden;
    position:relative;
    display:flex;
    flex-direction:column;
  }
  .tf-login-nav{
    height:84px;
    flex:0 0 84px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 clamp(22px,4.2vw,58px);
    background:#fff;
    gap:22px;
  }
  .tf-login-brand{
    border:0;
    background:#f8db13;
    color:#10233e;
    border-radius:999px;
    padding:10px 20px;
    cursor:pointer;
    font-weight:950;
    font-style:italic;
    letter-spacing:0;
    box-shadow:0 14px 28px rgba(248,219,19,.34);
  }
  .tf-login-brand span{ color:#2563eb; }
  .tf-login-nav nav{ display:flex; align-items:center; gap:clamp(18px,3vw,46px); }
  .tf-login-nav nav button{
    border:0;
    background:transparent;
    color:#6b7280;
    font-size:13px;
    font-weight:800;
    cursor:pointer;
  }
  .tf-login-menu{
    border:0;
    background:transparent;
    color:#17213a;
    font-size:24px;
    cursor:pointer;
  }
  .tf-login-hero{
    flex:1;
    min-height:0;
    display:grid;
    grid-template-columns:minmax(330px,360px) minmax(0,1fr);
    align-items:center;
    gap:clamp(28px,4vw,48px);
    padding:clamp(28px,4vw,48px) clamp(28px,5vw,62px);
    background:
      radial-gradient(circle at 18% 80%, rgba(255,255,255,.74), transparent 18%),
      linear-gradient(135deg,#dbeafe 0%,#eff6ff 45%,#bfdbfe 100%);
    position:relative;
  }
  .tf-login-hero::before{
    content:'';
    position:absolute;
    inset:auto 0 0;
    height:48%;
    background:linear-gradient(180deg,transparent,rgba(37,99,235,.11));
    pointer-events:none;
  }
  .tf-login-card{
    position:relative;
    z-index:2;
    border-radius:24px;
    padding:28px 30px;
    background:rgba(255,255,255,.80);
    border:1px solid rgba(255,255,255,.9);
    box-shadow:0 24px 54px rgba(15,23,42,.15);
    backdrop-filter:blur(18px);
  }
  .tf-login-card-top{
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:14px;
    margin-bottom:14px;
  }
  .tf-login-mini-logo{
    display:flex;
    align-items:center;
    gap:10px;
    color:#111827;
    font-size:20px;
    font-weight:950;
  }
  .tf-login-mini-logo span{
    width:28px;
    height:28px;
    display:grid;
    place-items:center;
    border-radius:10px;
    background:linear-gradient(135deg,#f8db13,#fde68a);
    font-size:14px;
    box-shadow:0 8px 18px rgba(248,219,19,.28);
  }
  .tf-login-card-top p{
    margin:2px 0 0;
    color:#64748b;
    font-size:12px;
    font-weight:800;
    text-align:right;
    line-height:1.25;
  }
  .tf-login-card-top p button{
    display:block;
    margin-left:auto;
    border:0;
    padding:0;
    background:transparent;
    color:#2563eb;
    font:inherit;
    cursor:pointer;
  }
  .tf-login-card h1{
    margin:0;
    color:#101828;
    font-size:clamp(38px,4.4vw,50px);
    line-height:1;
    font-weight:950;
    letter-spacing:0;
  }
  .tf-login-subtitle{
    margin:12px 0 20px;
    color:#667085;
    font-size:13px;
    line-height:1.55;
    font-weight:700;
  }
  .tf-login-social-row{
    display:grid;
    grid-template-columns:1fr 48px;
    gap:10px;
    margin-bottom:20px;
  }
  .tf-google-btn{
    height:48px;
    border:0;
    border-radius:10px;
    background:#2563eb;
    color:#fff;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:12px;
    font-weight:900;
    box-shadow:0 14px 28px rgba(37,99,235,.24);
  }
  .tf-google-btn span{
    width:23px;
    height:23px;
    border-radius:50%;
    background:#fff;
    color:#2563eb;
    display:grid;
    place-items:center;
    font-weight:950;
  }
  .tf-login-pink{
    border:0;
    border-radius:10px;
    background:#f8db13;
    color:#10233e;
    font-size:18px;
    font-weight:950;
    cursor:pointer;
    box-shadow:0 14px 28px rgba(248,219,19,.24);
  }
  .tf-login-field{
    display:block;
    margin-bottom:14px;
  }
  .tf-login-field span{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    color:#7a8699;
    font-size:12px;
    font-weight:900;
    margin-bottom:8px;
  }
  .tf-login-field span button{
    border:0;
    background:transparent;
    color:#2563eb;
    font:inherit;
    padding:0;
    cursor:pointer;
  }
  .tf-login-field input,
  .tf-login-password input{
    width:100%;
    height:48px;
    border:1px solid #d7e4f5;
    border-radius:10px;
    background:rgba(255,255,255,.92);
    color:#111827;
    outline:none;
    padding:0 16px;
    font-size:14px;
    font-weight:800;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.92);
  }
  .tf-login-field input:focus,
  .tf-login-password input:focus{
    border-color:#2563eb;
    box-shadow:0 0 0 4px rgba(37,99,235,.14);
  }
  .tf-login-password{
    position:relative;
  }
  .tf-login-password input{
    padding-right:76px;
  }
  .tf-login-password > button{
    position:absolute;
    right:10px;
    top:50%;
    transform:translateY(-50%);
    border:0;
    border-radius:8px;
    background:#eff6ff;
    color:#2563eb;
    padding:7px 10px;
    cursor:pointer;
    font-size:12px;
    font-weight:900;
  }
  .tf-login-error{
    margin:-2px 0 16px;
    background:#fef2f2;
    border:1px solid #fecaca;
    color:#b91c1c;
    padding:10px 12px;
    border-radius:10px;
    font-size:12px;
    font-weight:800;
    line-height:1.35;
  }
  .tf-login-submit{
    width:148px;
    height:48px;
    border:0;
    border-radius:10px;
    background:#10233e;
    color:#fff;
    cursor:pointer;
    font-weight:950;
    box-shadow:0 18px 32px rgba(16,35,62,.24);
  }
  .tf-login-submit:disabled,
  .tf-google-btn:disabled{
    opacity:.72;
    cursor:not-allowed;
  }
  .tf-login-alt{
    display:block;
    margin-top:14px;
    border:0;
    background:transparent;
    color:#2563eb;
    font-size:12px;
    font-weight:900;
    cursor:pointer;
    padding:0;
  }
  .tf-login-reset-done{
    text-align:center;
    padding:22px 0 4px;
  }
  .tf-login-reset-done div{ font-size:52px; margin-bottom:12px; }
  .tf-login-reset-done p{ color:#667085; font-size:14px; font-weight:800; line-height:1.45; }
  .tf-login-reset-done button{
    border:0;
    border-radius:10px;
    background:#2563eb;
    color:#fff;
    padding:13px 20px;
    cursor:pointer;
    font-weight:900;
  }
  .tf-login-visual{
    position:relative;
    height:100%;
    min-height:0;
    z-index:1;
  }
  .tf-stage{
    position:absolute;
    left:2%;
    right:3%;
    bottom:7%;
    height:min(330px,68%);
    transform:perspective(980px) rotateX(56deg) rotateZ(-10deg) scale(.9);
    transform-origin:center bottom;
    transform-style:preserve-3d;
    border-radius:36px;
    background:
      radial-gradient(circle at 72% 36%, rgba(248,219,19,.24), transparent 18%),
      linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#60a5fa 100%);
    box-shadow:0 46px 60px rgba(10,44,105,.35);
  }
  .tf-stage > *{
    transform-style:preserve-3d;
  }
  .tf-panel{
    position:absolute;
    width:210px;
    height:230px;
    border-radius:24px;
    background:rgba(255,255,255,.94);
    border:1px solid rgba(255,255,255,.8);
    box-shadow:0 24px 40px rgba(15,23,42,.20);
    transform:translateZ(120px) rotateX(-70deg) rotateZ(10deg);
    overflow:hidden;
  }
  .tf-panel::before{
    content:'';
    position:absolute;
    left:18px;
    top:18px;
    width:8px;
    height:8px;
    border-radius:50%;
    background:#ef4444;
    box-shadow:15px 0 #f8db13,30px 0 #22c55e;
  }
  .tf-panel span{
    position:absolute;
    left:42px;
    top:56px;
    width:126px;
    height:126px;
    border-radius:50%;
    border:14px solid #dbeafe;
  }
  .tf-panel div{
    position:absolute;
    right:24px;
    top:85px;
    width:58px;
    height:58px;
    border-radius:16px;
    background:linear-gradient(135deg,#f8db13,#f59e0b);
    transform:rotate(12deg);
    box-shadow:0 16px 20px rgba(245,158,11,.28);
  }
  .tf-panel-one{ left:34%; top:-60px; }
  .tf-panel-two{ right:4%; top:-22px; transform:translateZ(126px) rotateX(-70deg) rotateZ(10deg) scale(.92); }
  .tf-tool-figure{
    position:absolute;
    left:40%;
    top:22%;
    width:118px;
    height:156px;
    transform:translateZ(150px) rotateX(-70deg) rotateZ(10deg);
  }
  .tf-tool-head{
    width:82px;
    height:82px;
    margin:0 auto -4px;
    border-radius:50%;
    background:#fff;
    color:#2563eb;
    display:grid;
    place-items:center;
    font-size:34px;
    font-weight:950;
    box-shadow:0 16px 28px rgba(15,23,42,.16);
  }
  .tf-tool-body{
    width:118px;
    height:96px;
    border-radius:34px 34px 26px 26px;
    background:#fff;
    box-shadow:0 18px 30px rgba(15,23,42,.16);
  }
  .tf-yellow-helper{
    position:absolute;
    left:10%;
    top:12%;
    width:126px;
    height:178px;
    border-radius:70px 70px 48px 48px;
    background:linear-gradient(145deg,#f8db13 0%,#f59e0b 100%);
    box-shadow:0 22px 36px rgba(245,158,11,.30);
    transform:translateZ(112px) rotateX(-70deg) rotateZ(-14deg);
  }
  .tf-yellow-helper::before,
  .tf-yellow-helper::after{
    content:'';
    position:absolute;
    top:45px;
    width:24px;
    height:24px;
    border-radius:50%;
    background:#fff;
    border:5px solid #e2e8f0;
  }
  .tf-yellow-helper::before{ left:31px; }
  .tf-yellow-helper::after{ left:70px; }
  .tf-cube{
    position:absolute;
    width:38px;
    height:38px;
    border-radius:8px;
    background:linear-gradient(135deg,#f8db13,#f97316);
    box-shadow:0 14px 18px rgba(15,23,42,.16);
    transform:translateZ(80px) rotateX(-70deg) rotateZ(10deg);
  }
  .tf-cube-a{ left:12%; top:66%; }
  .tf-cube-b{ right:18%; bottom:16%; background:linear-gradient(135deg,#fff,#f8db13); }
  .tf-token{
    position:absolute;
    width:50px;
    height:16px;
    border-radius:5px;
    background:#fff;
    box-shadow:0 10px 18px rgba(15,23,42,.14);
    transform:translateZ(62px) rotateX(-70deg) rotateZ(10deg);
  }
  .tf-token-a{ left:24%; bottom:20%; }
  .tf-token-b{ left:46%; bottom:36%; }
  .tf-token-c{ right:30%; bottom:13%; }
  .tf-login-badge{
    position:absolute;
    right:8%;
    bottom:16%;
    width:210px;
    border-radius:20px;
    padding:16px;
    background:rgba(255,255,255,.92);
    box-shadow:0 20px 38px rgba(15,23,42,.18);
    transform:translateZ(128px) rotateX(-70deg) rotateZ(10deg);
  }
  .tf-login-badge b{
    display:block;
    color:#10233e;
    font-size:15px;
    font-weight:950;
    margin-bottom:5px;
  }
  .tf-login-badge span{
    display:block;
    color:#64748b;
    font-size:12px;
    font-weight:800;
    line-height:1.35;
  }
  @media (max-width:920px){
    .tf-login-page{ padding:0; align-items:stretch; overflow:auto; }
    .tf-login-shell{ width:100%; min-height:100dvh; height:auto; border-radius:0; }
    .tf-login-nav{ height:84px; padding:0 20px; }
    .tf-login-nav nav{ display:none; }
    .tf-login-hero{ grid-template-columns:1fr; gap:20px; min-height:auto; padding:28px 18px 46px; }
    .tf-login-card{ max-width:430px; width:100%; margin:0 auto; padding:28px 22px; }
    .tf-login-visual{ min-height:280px; max-width:520px; width:100%; margin:0 auto; }
    .tf-stage{ left:8%; right:8%; height:260px; bottom:0; transform:perspective(760px) rotateX(56deg) rotateZ(-10deg) scale(.78); transform-origin:center bottom; }
    .tf-login-card h1{ font-size:42px; }
  }
  @media (max-width:1100px) and (min-width:921px){
    .tf-login-shell{ width:min(980px,100%); }
    .tf-login-hero{ grid-template-columns:340px minmax(0,1fr); gap:28px; padding:32px 42px; }
    .tf-login-card{ padding:26px; }
    .tf-login-card h1{ font-size:42px; }
    .tf-stage{ transform:perspective(900px) rotateX(56deg) rotateZ(-10deg) scale(.78); }
    .tf-panel{ transform:translateZ(120px) rotateX(-70deg) rotateZ(10deg) scale(.9); }
    .tf-panel-two{ transform:translateZ(126px) rotateX(-70deg) rotateZ(10deg) scale(.82); }
    .tf-login-badge{ transform:translateZ(128px) rotateX(-70deg) rotateZ(10deg) scale(.9); }
  }
  @media (max-width:520px){
    .tf-login-visual{ display:none; }
    .tf-login-hero{ min-height:calc(100vh - 84px); align-items:center; }
    .tf-login-card-top{ align-items:center; }
    .tf-login-card-top p{ max-width:118px; }
    .tf-login-social-row{ grid-template-columns:1fr 48px; }
    .tf-login-submit{ width:100%; }
  }
`

// ─────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────
