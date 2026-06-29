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

export function RegisterScreen() {
  const { th, navigate, refreshUser, lang } = useApp()
  const t = T[lang]
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', role: 'user' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [sliderActive, setSliderActive] = useState(true)

  const goLogin = () => {
    setSliderActive(false)
    window.setTimeout(() => navigate('login'), 520)
  }

  const F = (k) => ({
    value: form[k],
    onChange: v => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) },
    error: errors[k],
  })

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = t.required
    if (!form.email.includes('@')) e.email = t.invalidEmail
    if (form.password.length < 6) e.password = t.minLength6
    if (form.password !== form.confirm) e.confirm = t.passNoMatch
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return
    if (!acceptedTerms) { setTermsError(true); return }
    setTermsError(false)
    setLoading(true)
    try {
      const res = await auth.signUp({ email: form.email.trim(), password: form.password, fullName: form.name.trim(), role: form.role })
      // Si es técnico y ya quedó con sesión (sin confirmación por correo),
      // lo llevamos a su perfil. Desde allí puede abrir la verificación cuando
      // Supabase tenga activadas las tablas del Centro de Verificación.
      if (res?.session && form.role === 'technician') {
        await refreshUser()
        navigate('profile')
        return
      }
      setSuccess(true)
    } catch (err) {
      setErrors({ email: err.message || 'Error al registrarse.' })
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="tf-slider-page">
      <style>{authFormCss}</style>
      <div className="tf-auth-card tf-auth-success">
        <div className="tf-auth-icon">🎉</div>
        <p className="tf-auth-success-title">{t.accountCreated}</p>
        <p className="tf-auth-copy">
          {form.role === 'technician'
            ? 'Confirma tu correo e inicia sesión. Luego completa tu postulación (cédula, oficios y documentos) para que Tecnifix te apruebe y aparezcas como técnico verificado.'
            : 'Revisa tu bandeja de entrada y confirma tu correo.'}
        </p>
        <Btn onClick={goLogin}>Ir al login</Btn>
      </div>
    </div>
  )

  return (
    <div className="tf-slider-page">
      <style>{authFormCss}</style>
      <button className="tf-slider-home" onClick={() => navigate('home')} aria-label="Ir al inicio">
        TECNI<span>FIX</span>
      </button>
      <div className={`tf-slider-container tf-register-slider-container ${sliderActive ? 'right-panel-active' : ''}`} id="container">
        <div className="form-container sign-up-container">
          <form onSubmit={(e) => { e.preventDefault(); handleRegister() }}>
            <div className="tf-register-scroll">
              <h1>Crear cuenta</h1>
              <div className="social-container">
                <button type="button" className="social">f</button>
                <button type="button" className="social">G</button>
                <button type="button" className="social">in</button>
                <button type="button" className="social">⌘</button>
              </div>
              <span>usa tu correo para registrarte</span>

              <div className="tf-auth-steps" aria-hidden="true">
                <div className="active"><span>1</span><b>Tipo de cuenta</b></div>
                <div className="active"><span>2</span><b>Datos básicos</b></div>
                <div><span>3</span><b>Verificación</b></div>
              </div>

              <p className="tf-auth-section">Tipo de cuenta</p>
              <div className="tf-role-grid">
                {[{ v: 'user', label: `👤 ${t.iAmClient}`, desc: t.lookingTechs }, { v: 'technician', label: `🛠️ ${t.iAmTech}`, desc: t.offerServices }].map(r => (
                  <button type="button" key={r.v} onClick={() => setForm(f => ({ ...f, role: r.v }))}
                    className={form.role === r.v ? 'tf-role-card active' : 'tf-role-card'}>
                    <p>{r.label}</p>
                    <span>{r.desc}</span>
                  </button>
                ))}
              </div>

              <div className="tf-field-grid">
                <Input label={t.fullName} placeholder="Juan Pérez" {...F('name')} />
                <Input label={t.email} placeholder="tu@email.com" type="email" {...F('email')} />
                <Input label={t.phone} placeholder="+507 6000-0000" {...F('phone')} />
                <Input label={t.password} placeholder="Mínimo 6 caracteres" type="password" {...F('password')} />
              </div>
              <Input label={t.confirmPassword} placeholder="Repite tu contraseña" type="password" {...F('confirm')} />

              <div onClick={() => { setAcceptedTerms(v => !v); setTermsError(false) }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16,
                  cursor: 'pointer', padding: '13px 14px', borderRadius: 16,
                  background: termsError ? '#fee2e2' : '#f6f8fc',
                  border: `1px solid ${termsError ? '#fca5a5' : '#e8edf5'}`
                }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${acceptedTerms ? th.primary : th.border}`,
                  background: acceptedTerms ? th.primary : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 900
                }}>
                  {acceptedTerms && '✓'}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: termsError ? '#991b1b' : th.textSec, lineHeight: 1.6, textAlign: 'left' }}>
                  Acepto los{' '}
                  <span onClick={(e) => { e.stopPropagation(); navigate('legal') }}
                    style={{ color: th.primary, fontWeight: 700, textDecoration: 'underline' }}>
                    Términos y Condiciones
                  </span>{' '}
                  y la{' '}
                  <span onClick={(e) => { e.stopPropagation(); navigate('legal') }}
                    style={{ color: th.primary, fontWeight: 700, textDecoration: 'underline' }}>
                    Política de Privacidad
                  </span>{' '}
                  de Tecnifix.
                </p>
              </div>

              <button type="submit" className="tf-slider-main-btn" disabled={loading}>
                {loading ? 'Creando...' : t.create}
              </button>
              <button type="button" className="tf-slider-mobile-switch" onClick={goLogin}>Ya tengo cuenta</button>
            </div>
          </form>
        </div>

        <div className="form-container sign-in-container">
          <form onSubmit={(e) => { e.preventDefault(); goLogin() }}>
            <h1>Iniciar sesión</h1>
            <div className="social-container">
              <button type="button" className="social">f</button>
              <button type="button" className="social">G</button>
              <button type="button" className="social">in</button>
              <button type="button" className="social">⌘</button>
            </div>
            <span>entra con tu cuenta existente</span>
            <input type="email" placeholder="Correo electrónico" readOnly />
            <input type="password" placeholder="Contraseña" readOnly />
            <button type="submit" className="tf-slider-main-btn">Iniciar sesión</button>
          </form>
        </div>

        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>¡Bienvenido de vuelta!</h1>
              <p>Si ya tienes cuenta, inicia sesión y sigue con tus solicitudes o verificación.</p>
              <button type="button" className="ghost" onClick={goLogin}>Iniciar sesión</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Hola, futuro miembro</h1>
              <p>Regístrate como cliente o técnico. Si eres técnico, el dueño podrá revisar y aprobar tu verificación.</p>
              <button type="button" className="ghost" onClick={() => setSliderActive(true)}>Crear cuenta</button>
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
    width:min(1040px,100%);
    min-height:640px;
  }
  .tf-register-slider-container{ min-height:680px; }
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
  .tf-slider-container > .form-container span,
  .tf-slider-container form > span{
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
    padding:0 34px;
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
    background:#102740;
    background:linear-gradient(135deg,#102740 0%,#1d4ed8 58%,#2563eb 100%);
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
      radial-gradient(circle at 20% 28%, rgba(248,219,19,.34), transparent 20%),
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
    margin:18px 0;
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
  .tf-register-scroll{
    width:100%;
    max-height:620px;
    overflow:auto;
    padding:16px 4px 20px;
  }
  .tf-register-scroll::-webkit-scrollbar{ display:none; }
  .tf-slider-mobile-switch{
    border:0;
    background:transparent;
    color:#2563eb;
    font-size:13px;
    font-weight:900;
    margin:14px 0 0;
    cursor:pointer;
  }
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
    .sign-in-container{ display:none; }
    .sign-up-container{ display:block; width:100%; opacity:1; }
    .tf-slider-container form{ padding:86px 24px 36px; }
    .tf-register-scroll{ max-height:none; overflow:visible; }
    .tf-slider-mobile-switch{ display:block; }
  }
  @media (min-width:761px){
    .tf-slider-mobile-switch{ display:none; }
  }

  .tf-auth-page{
    min-height:100vh;
    box-sizing:border-box;
    padding:clamp(28px,5vw,70px) 16px 70px;
    background:
      radial-gradient(circle at 50% 2%, rgba(255,184,75,.85) 0 92px, transparent 94px),
      radial-gradient(circle at 8% 86%, rgba(255,225,184,.8) 0 58px, transparent 60px),
      radial-gradient(circle at 92% 80%, rgba(255,221,174,.75) 0 46px, transparent 48px),
      linear-gradient(to bottom,#ffe6c6 0 42%,#ff8a00 42% 100%);
    display:flex;
    align-items:flex-start;
    justify-content:center;
  }
  .tf-auth-card{
    width:min(900px,100%);
    background:#fff;
    border:1px solid rgba(226,232,240,.92);
    border-radius:22px;
    box-shadow:0 28px 70px rgba(127,71,0,.20);
    padding:clamp(22px,4vw,42px);
    position:relative;
  }
  .tf-auth-success{ max-width:520px; text-align:center; align-self:center; }
  .tf-auth-icon{ font-size:64px; margin-bottom:14px; }
  .tf-auth-success-title{ margin:0 0 8px; color:#111b37; font-size:24px; font-weight:900; }
  .tf-auth-copy{ margin:0 auto 24px; color:#6b7890; font-size:14px; line-height:1.55; max-width:440px; }
  .tf-auth-top{ display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:16px; margin-bottom:26px; }
  .tf-auth-top h2{ margin:0; color:#111b37; font-size:18px; font-weight:900; text-align:center; }
  .tf-auth-top p{ margin:0; justify-self:end; color:#667085; font-size:12px; font-weight:700; }
  .tf-auth-top p button{ border:0; background:none; color:#2563eb; font:inherit; cursor:pointer; padding:0; }
  .tf-auth-back{ width:38px; height:38px; border-radius:50%; border:1px solid #e8edf5; background:#fff; color:#111b37; cursor:pointer; box-shadow:0 8px 18px rgba(15,23,42,.08); font-size:18px; }
  .tf-auth-steps{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:0 auto 28px; max-width:560px; position:relative; }
  .tf-auth-steps::before{ content:''; position:absolute; left:14%; right:14%; top:12px; height:1px; background:#e5eaf2; }
  .tf-auth-steps div{ position:relative; text-align:center; color:#98a2b3; font-size:11px; font-weight:800; }
  .tf-auth-steps span{ width:24px; height:24px; border-radius:50%; background:#f2f5fa; color:#98a2b3; display:grid; place-items:center; margin:0 auto 6px; position:relative; z-index:1; }
  .tf-auth-steps .active span{ background:#2563eb; color:#fff; box-shadow:0 8px 18px rgba(37,99,235,.25); }
  .tf-auth-steps .active{ color:#111b37; }
  .tf-auth-section{ margin:0 0 16px; color:#111b37; font-size:14px; font-weight:900; }
  .tf-role-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-bottom:22px; }
  .tf-role-card{ text-align:left; border:1px solid #dbeafe; border-radius:16px; background:#f8fbff; padding:14px; cursor:pointer; font-family:inherit; }
  .tf-role-card.active{ background:#fffbea; border-color:#f8db13; box-shadow:0 10px 24px rgba(248,219,19,.18); }
  .tf-role-card p{ margin:0 0 4px; color:#111b37; font-size:14px; font-weight:900; }
  .tf-role-card span{ color:#6b7890; font-size:12px; line-height:1.35; }
  .tf-field-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 16px; }
  @media (max-width:720px){
    .tf-auth-top{ grid-template-columns:auto 1fr; }
    .tf-auth-top p{ grid-column:1 / -1; justify-self:center; }
    .tf-auth-steps{ gap:0; }
    .tf-auth-steps b{ display:none; }
    .tf-role-grid,.tf-field-grid{ grid-template-columns:1fr; }
  }
`

// ─────────────────────────────────────────────────────────────
// EDIT PROFILE (info personal)
// ─────────────────────────────────────────────────────────────
