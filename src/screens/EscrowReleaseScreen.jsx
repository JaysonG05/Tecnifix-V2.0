import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { requestActions, receiptActions } from '../lib/payments.js'
import { PageHeader, Btn, Spinner } from '../components/UI.jsx'

export function EscrowReleaseScreen() {
  const { th, navigate, user, setSelectedRequest } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [requestTitle, setRequestTitle] = useState('')
  const [techName, setTechName] = useState('')
  const [amount, setAmount] = useState(0)
  const processRef = useRef(false)

  useEffect(() => {
    // Evitar doble ejecución en StrictMode
    if (processRef.current) return;
    processRef.current = true;

    const processRelease = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const reqId = urlParams.get('release');
        
        if (!reqId) throw new Error('Código QR inválido o incompleto.');

        if (!user) {
          throw new Error('Debes iniciar sesión para liberar estos fondos.');
        }

        // Obtener datos de la solicitud
        const { data: req, error: fetchErr } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', reqId)
          .single();

        if (fetchErr || !req) throw new Error('No se encontró la solicitud.');
        if (req.client_id !== user.id) throw new Error('Solo el cliente de esta solicitud puede liberar los fondos.');
        
        setRequestTitle(req.title)
        setTechName(req.technician_name)
        setAmount(req.agreed_price || 0)

        if (req.payment_status === 'paid') {
          // Ya estaba pagado
          setSuccess(true)
          setLoading(false)
          return
        }

        if (req.payment_status !== 'escrow') {
          throw new Error('Esta solicitud no tiene fondos en garantía.');
        }

        // Simular animación de smart contract (2 segundos)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Actualizar base de datos: Liberar pago y completar servicio
        await supabase
          .from('service_requests')
          .update({ 
            payment_status: 'paid', 
            status: 'completed'
          })
          .eq('id', reqId);

        // Intentar generar recibo
        try {
          await receiptActions.generate({
            requestId: req.id,
            clientId: req.client_id,
            technicianId: req.technician_id,
            serviceTitle: req.title,
            serviceDescription: req.description,
            amount: req.agreed_price ?? 0,
            paymentMethod: 'escrow',
            paymentReference: 'QR_RELEASE',
            clientName: req.client_name,
            technicianName: req.technician_name,
          });
        } catch (e) {
          console.warn('Error al generar recibo tras liberación', e);
        }

        setSuccess(true)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    processRelease();
  }, [user]);

  const goHome = () => navigate('home')

  if (error) {
    return (
      <div style={{ background: th.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: th.text, margin: '0 0 12px' }}>Error en la Liberación</h2>
        <p style={{ color: th.textSec, marginBottom: 24, fontSize: 14 }}>{error}</p>
        <Btn onClick={goHome}>Ir al inicio</Btn>
      </div>
    )
  }

  return (
    <div style={{ background: th.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="🛡️ Smart Contract" onBack={goHome} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 30px' }}>
              <div style={{ position: 'absolute', inset: 0, border: `4px solid ${th.border}`, borderRadius: '50%' }}></div>
              <div style={{ position: 'absolute', inset: 0, border: '4px solid #16a34a', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🛡️</div>
            </div>
            <h2 style={{ color: th.text, marginBottom: 8 }}>Liberando Fondos...</h2>
            <p style={{ color: th.textSec, fontSize: 14 }}>Verificando contrato y transfiriendo al técnico.</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 400, animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: 50, background: '#dcfce7', 
              color: '#16a34a', fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', boxShadow: '0 10px 25px rgba(22,163,74,0.2)'
            }}>
              ✓
            </div>
            <h2 style={{ color: th.text, marginBottom: 8, fontSize: 28, fontWeight: 900 }}>¡Fondos Liberados!</h2>
            <p style={{ color: th.textSec, fontSize: 15, marginBottom: 30 }}>
              El pago de <strong>${Number(amount).toFixed(2)}</strong> ha sido transferido con éxito a <strong>{techName}</strong>.
            </p>
            
            <div style={{ background: th.surface, borderRadius: 16, padding: 16, marginBottom: 30, border: `1px solid ${th.border}` }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: th.textSec }}>Servicio Completado:</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: th.text }}>{requestTitle}</p>
            </div>

            <Btn onClick={goHome} style={{ width: '100%' }}>Finalizar</Btn>
          </div>
        )}
      </div>
    </div>
  )
}
