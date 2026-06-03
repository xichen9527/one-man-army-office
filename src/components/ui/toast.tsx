import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastVariant = 'default' | 'destructive' | 'success'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((opts: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, ...opts, variant: opts.variant || 'default' }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm animate-in slide-in-from-right-full ${
              t.variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' :
              t.variant === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-white border-gray-200 text-gray-800'
            }`}
          >
            {t.variant === 'destructive' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" /> :
             t.variant === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" /> :
             <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{t.title}</p>
              {t.description && <p className="text-xs mt-0.5 opacity-80">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="shrink-0 hover:opacity-70">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export function toast(opts: { title: string; description?: string; variant?: ToastVariant }) {
  // Fallback for non-hook contexts
  const id = crypto.randomUUID()
  const msg = document.createElement('div')
  msg.style.cssText = `position:fixed;bottom:1rem;right:1rem;z-index:99999;padding:0.75rem 1rem;min-width:16rem;max-width:20rem;border-radius:0.5rem;box-shadow:0 4px 12px rgba(0,0,0,.15);font-size:0.875rem;background:${opts.variant === 'destructive' ? '#fef2f2' : opts.variant === 'success' ? '#f0fdf4' : '#fff'};color:${opts.variant === 'destructive' ? '#991b1b' : opts.variant === 'success' ? '#166534' : '#1f2937'};border:1px solid ${opts.variant === 'destructive' ? '#fecaca' : opts.variant === 'success' ? '#bbf7d0' : '#e5e7eb'};display:flex;align-items:center;gap:0.5rem;animation:toastIn .2s ease-out`
  msg.innerHTML = `<span style="font-weight:600">${opts.title}</span>${opts.description ? `<span style="margin-left:.5rem;opacity:.8;font-size:.8rem">${opts.description}</span>` : ''} <button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:1rem;line-height:1;opacity:.5">×</button>`
  document.body.appendChild(msg)
  setTimeout(() => { if (msg.parentElement) { msg.style.opacity = '0'; setTimeout(() => msg.remove(), 300) } }, 3500)
}
