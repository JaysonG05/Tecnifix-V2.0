// ============================================================
//  LegalScreen.jsx — Términos y Condiciones / Política de Privacidad
// ============================================================
import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader } from '../components/UI.jsx'

const Section = ({ th, title, children }) => (
    <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: th.text, margin: '0 0 6px' }}>{title}</p>
        <p style={{ fontSize: 13, color: th.textSec, lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
)

export function LegalScreen() {
    const { th, lang } = useApp()
    const [tab, setTab] = useState('terms') // terms | privacy

    return (
        <div style={{ background: th.bg, minHeight: '100vh', paddingBottom: 40 }}>
            <PageHeader title="📄 Legal" />

            <div style={{ display: 'flex', borderBottom: `1px solid ${th.border}`, background: th.surface }}>
                {[
                    ['terms', lang === 'en' ? 'Terms of Service' : 'Términos y Condiciones'],
                    ['privacy', lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'],
                ].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)}
                        style={{
                            flex: 1, padding: '12px 8px', background: 'none', border: 'none',
                            cursor: 'pointer', fontWeight: tab === id ? 700 : 400,
                            color: tab === id ? th.primary : th.textSec, fontSize: 13,
                            borderBottom: tab === id ? `2.5px solid ${th.primary}` : '2.5px solid transparent',
                            fontFamily: 'inherit'
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            <div style={{ padding: '20px 16px' }}>
                <p style={{ fontSize: 11, color: th.textSec, marginBottom: 20 }}>
                    {lang === 'en' ? 'Last updated: June 2026' : 'Última actualización: junio 2026'}
                </p>

                {tab === 'terms' ? (
                    <>
                        <Section th={th} title="1. Naturaleza del servicio">
                            Changuinola Pro es una plataforma de intermediación que conecta a personas que requieren
                            servicios técnicos (clientes) con profesionales independientes que ofrecen dichos servicios
                            (técnicos). Changuinola Pro no es empleador de los técnicos registrados, no presta los
                            servicios directamente y no garantiza la calidad, idoneidad o resultado del trabajo realizado.
                        </Section>

                        <Section th={th} title="2. Responsabilidad de los usuarios">
                            Cada técnico es responsable de la veracidad de la información, certificados y experiencia
                            que declare en su perfil. Cada cliente es responsable de verificar dicha información antes
                            de contratar. El acuerdo de servicio (contrato digital) se establece directamente entre el
                            cliente y el técnico; Changuinola Pro únicamente provee el medio digital para formalizarlo.
                        </Section>

                        <Section th={th} title="3. Pagos">
                            Los pagos realizados a través de la plataforma (Yappy, transferencia bancaria o efectivo)
                            se procesan directamente entre cliente y técnico. Changuinola Pro no retiene, custodia ni
                            procesa fondos. La confirmación de pago dentro de la app es declarativa y queda registrada
                            como evidencia, pero no constituye una garantía de la transacción bancaria subyacente.
                        </Section>

                        <Section th={th} title="4. Cuentas y verificación">
                            La verificación de técnicos (insignia "Verificado") indica que el equipo de Changuinola Pro
                            revisó la documentación proporcionada, pero no constituye una certificación profesional
                            oficial ni una garantía absoluta de idoneidad.
                        </Section>

                        <Section th={th} title="5. Disputas">
                            En caso de desacuerdo entre cliente y técnico, cualquiera de las partes puede abrir una
                            disputa dentro de la app. El equipo administrativo de Changuinola Pro mediará de buena fe
                            basándose en la evidencia disponible (contrato digital, fotos, comprobantes), pero sus
                            decisiones no sustituyen procesos legales formales ante autoridades competentes.
                        </Section>

                        <Section th={th} title="6. Conducta y suspensión de cuentas">
                            Changuinola Pro se reserva el derecho de suspender o eliminar cuentas que incurran en
                            fraude, suplantación de identidad, contenido ofensivo, reseñas falsas o cualquier conducta
                            que afecte la confianza de la comunidad.
                        </Section>

                        <Section th={th} title="7. Modificaciones">
                            Estos términos pueden actualizarse periódicamente. El uso continuado de la plataforma tras
                            una actualización constituye la aceptación de los nuevos términos.
                        </Section>
                    </>
                ) : (
                    <>
                        <Section th={th} title="1. Datos que recopilamos">
                            Recopilamos: información de registro (nombre, correo, teléfono), ubicación geográfica
                            (con tu consentimiento, para mostrar técnicos cercanos), fotografías de perfil y de trabajos,
                            documentos de certificación que decidas subir, historial de solicitudes de servicio,
                            calificaciones y mensajes asociados a disputas.
                        </Section>

                        <Section th={th} title="2. Uso de la información">
                            Tu información se utiliza para: operar la plataforma (conectar clientes con técnicos),
                            calcular distancias y mostrar técnicos cercanos, generar recibos y comprobantes,
                            enviar notificaciones relacionadas con tus solicitudes, y permitir la moderación de
                            contenido por parte del equipo administrativo.
                        </Section>

                        <Section th={th} title="3. Almacenamiento">
                            Los datos se almacenan en Supabase, un proveedor de infraestructura en la nube que aplica
                            cifrado en tránsito y en reposo. Las imágenes (fotos de perfil, certificados, comprobantes
                            de pago) se almacenan en buckets de almacenamiento con acceso restringido según el tipo
                            de documento.
                        </Section>

                        <Section th={th} title="4. Compartición con terceros">
                            Changuinola Pro no vende ni comparte tu información personal con terceros con fines
                            publicitarios. La información de contacto (teléfono/WhatsApp) que configures como
                            "pública" en tu perfil técnico será visible para otros usuarios de la plataforma, ya que
                            es necesaria para que los clientes puedan contactarte.
                        </Section>

                        <Section th={th} title="5. Tus derechos">
                            Puedes acceder, corregir o eliminar tu información personal desde la sección de
                            configuración de tu perfil. La eliminación de cuenta es permanente; los recibos de
                            transacciones ya completadas se conservan por razones de evidencia e historial financiero.
                        </Section>

                        <Section th={th} title="6. Menores de edad">
                            Changuinola Pro no está dirigido a menores de 18 años. No recopilamos intencionalmente
                            información de menores de edad.
                        </Section>

                        <Section th={th} title="7. Contacto">
                            Para consultas sobre privacidad o solicitudes relacionadas con tus datos, puedes
                            contactar al equipo de Changuinola Pro a través de la sección de soporte en
                            Configuración.
                        </Section>
                    </>
                )}
            </div>
        </div>
    )
}