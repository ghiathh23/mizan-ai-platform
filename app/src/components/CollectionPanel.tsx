import { FormEvent, useEffect, useState } from 'react'
import { collectionService, type CollectionPaymentMethod, type CollectionRecord } from '../services/collectionService'
import { isCollectionReady } from './collectionPanelLogic'

interface CollectionPanelProps {
  projectId: string
  invoiceId?: string | null
  disabled?: boolean
  onMessage?: (message: string) => void
}

const methods: Array<{ value: CollectionPaymentMethod; label: string }> = [
  { value: 'cash', label: 'نقدًا' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'mobile_money', label: 'دفع جوال' },
  { value: 'other', label: 'أخرى' },
]

export function CollectionPanel({ projectId, invoiceId, disabled, onMessage }: CollectionPanelProps) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<CollectionPaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [records, setRecords] = useState<CollectionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const ready = isCollectionReady(projectId, invoiceId, disabled)

  async function load() {
    if (!projectId) return
    const result = await collectionService.list(projectId, invoiceId ?? undefined)
    setRecords(result)
  }

  useEffect(() => { void load().catch((error) => onMessage?.(error instanceof Error ? error.message : 'تعذر تحميل التحصيلات.')) }, [projectId, invoiceId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      onMessage?.('أدخل مبلغ تحصيل صحيحًا أكبر من صفر.')
      return
    }
    if (!invoiceId) {
      onMessage?.('لا يمكن تسجيل التحصيل قبل تحديد الفاتورة.')
      return
    }
    setLoading(true)
    try {
      await collectionService.record({ project_id: projectId, invoice_id: invoiceId, amount: numericAmount, payment_method: method, reference_number: reference, notes })
      setAmount('')
      setReference('')
      setNotes('')
      await load()
      onMessage?.('تم تسجيل التحصيل بنجاح.')
    } catch (error) {
      onMessage?.(error instanceof Error ? error.message : 'تعذر تسجيل التحصيل.')
    } finally { setLoading(false) }
  }

  return <section className="panel">
    <h2>التحصيل</h2>
    <p className="hint">يُسمح بالتسجيل والإلغاء وفق صلاحيات المشروع التي يتحقق منها الخادم.</p>
    <form onSubmit={submit} className="grid">
      <label>المبلغ<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={!ready || loading} /></label>
      <label>طريقة الدفع<select value={method} onChange={(event) => setMethod(event.target.value as CollectionPaymentMethod)} disabled={!ready || loading}>{methods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>رقم المرجع<input value={reference} onChange={(event) => setReference(event.target.value)} disabled={!ready || loading} /></label>
      <label>ملاحظات<textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!ready || loading} /></label>
      <button type="submit" disabled={!ready || loading}>{loading ? 'جارٍ التسجيل…' : 'تسجيل التحصيل'}</button>
    </form>
    <div className="list">{records.map((record) => <div className="list-item" key={record.id}><strong>{record.amount}</strong><span>{record.payment_method} · {record.status}</span><span>{record.reference_number || 'بدون مرجع'}</span></div>)}</div>
  </section>
}
