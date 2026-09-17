import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { mizanService } from './services/mizanService'
import { parseAndValidateReadingValue, validateEvidenceFile } from './lib/validation'
import type { BillingResult, Meter, MeterReading, Project, Subscriber } from './types/domain'

const emptySubscriber = { full_name: '', phone: '', subscriber_code: '' }

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [subscriber, setSubscriber] = useState(emptySubscriber)
  const [meters, setMeters] = useState<Meter[]>([])
  const [meterId, setMeterId] = useState('')
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [extractedValue, setExtractedValue] = useState('')
  const [officialValue, setOfficialValue] = useState('')
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10))
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidenceId, setEvidenceId] = useState('')
  const [readingId, setReadingId] = useState('')
  const [billing, setBilling] = useState<BillingResult | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) void loadProjects() }, [session])
  useEffect(() => {
    if (projectId) void Promise.all([loadSubscribers(), loadMeters()])
  }, [projectId])
  useEffect(() => { if (meterId) void loadReadings() }, [meterId])

  const selectedReading = useMemo(
    () => readings.find((item) => item.id === readingId && item.meter_id === meterId),
    [readings, readingId, meterId],
  )

  async function run(task: () => Promise<void>) {
    setLoading(true)
    setMessage('')
    try { await task() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'حدث خطأ غير متوقع.') }
    finally { setLoading(false) }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    })
  }

  async function loadProjects() { setProjects(await mizanService.listProjects()) }
  async function loadSubscribers() { setSubscribers(await mizanService.listSubscribers(projectId)) }
  async function loadMeters() { setMeters(await mizanService.listMeters(projectId)) }
  async function loadReadings() { setReadings(await mizanService.listReadings(meterId)) }

  async function createSubscriber(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      await mizanService.createSubscriber({ project_id: projectId, ...subscriber })
      setSubscriber(emptySubscriber)
      await loadSubscribers()
    })
  }

  async function uploadEvidence() {
    if (!evidenceFile || !projectId || !meterId) return
    const validationError = validateEvidenceFile(evidenceFile)
    if (validationError) { setMessage(validationError); return }
    await run(async () => {
      const result = await mizanService.uploadEvidence(projectId, meterId, evidenceFile, {
        source: 'web', user_agent: navigator.userAgent,
      })
      setEvidenceId(result.id)
      setMessage(`تم إنشاء سجل الدليل وربطه بالعداد. المعرف: ${result.id}`)
    })
  }

  async function createReading() {
    const parsed = parseAndValidateReadingValue(extractedValue)
    if (parsed.error || parsed.value === null) { setMessage(parsed.error ?? 'قيمة القراءة مطلوبة.'); return }
    const extracted = parsed.value
    await run(async () => {
      const created = await mizanService.createReading({
        project_id: projectId, meter_id: meterId,
        reading_at: new Date(`${readingDate}T00:00:00Z`).toISOString(),
        extracted_value: extracted, evidence_id: evidenceId || null,
        validation_status: 'proposed',
      })
      setReadingId(created.id)
      setOfficialValue('')
      await loadReadings()
      setMessage('تم تسجيل القراءة المقترحة بنجاح.')
    })
  }

  async function validateAndBill() {
    if (!selectedReading) { setMessage('اختر قراءة مرتبطة بالعداد الحالي أولًا.'); return }
    const parsed = parseAndValidateReadingValue(officialValue)
    if (parsed.error || parsed.value === null) { setMessage(parsed.error ?? 'القيمة الرسمية مطلوبة.'); return }
    const official = parsed.value
    await run(async () => {
      await mizanService.validateReading(selectedReading.id, official)
      const periodStart = `${readingDate.slice(0, 7)}-01`
      const result = await mizanService.generateInvoice(selectedReading.id, periodStart, readingDate, readingDate)
      setBilling(result)
      await loadReadings()
      setMessage('تم اعتماد القراءة ومحاولة إصدار الفاتورة بنجاح.')
    })
  }

  if (!session) return (
    <main className="shell" dir="rtl"><section className="panel">
      <h1>ميزان AI</h1><p>تسجيل الدخول إلى منصة إدارة خدمات المياه</p>
      <form onSubmit={signIn}>
        <label>البريد الإلكتروني<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <label>كلمة المرور<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
        <button disabled={loading}>{loading ? 'جارٍ التنفيذ…' : 'تسجيل الدخول'}</button>
        <p className="error">{message}</p>
      </form>
    </section></main>
  )

  return <main className="shell" dir="rtl">
    <header className="topbar"><div><h1>ميزان AI</h1><span>{session.user.email}</span></div><button onClick={() => void supabase.auth.signOut()}>تسجيل الخروج</button></header>
    <section className="panel"><h2>سياق المشروع</h2>
      <label>المشروع<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setMeterId(''); setReadingId(''); setBilling(null); setEvidenceId('') }}>
        <option value="">اختر مشروعًا</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select></label><p className="hint">تُحمّل المشاريع من Supabase ولا يوجد project ID ثابت في الواجهة.</p>
    </section>
    {projectId && <>
      <section className="panel"><h2>المشتركون</h2><div className="list">{subscribers.map((item) => <div className="list-item" key={item.id}><strong>{item.full_name}</strong><span>{item.phone || 'بدون هاتف'} · {item.status || 'غير محدد'}</span></div>)}</div>
        <form onSubmit={createSubscriber} className="grid"><input placeholder="اسم المشترك" value={subscriber.full_name} onChange={(event) => setSubscriber({ ...subscriber, full_name: event.target.value })} required /><input placeholder="رقم الهاتف" value={subscriber.phone} onChange={(event) => setSubscriber({ ...subscriber, phone: event.target.value })} /><input placeholder="رمز المشترك" value={subscriber.subscriber_code} onChange={(event) => setSubscriber({ ...subscriber, subscriber_code: event.target.value })} /><button disabled={loading}>إنشاء مشترك</button></form>
      </section>
      <section className="panel"><h2>العداد والقراءات</h2><label>العداد<select value={meterId} onChange={(event) => { setMeterId(event.target.value); setReadingId(''); setBilling(null); setEvidenceId('') }}><option value="">اختر العداد</option>{meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.serial_number} ({meter.meter_type})</option>)}</select></label>
        {meterId && <><div className="list">{readings.slice(0, 5).map((item) => <button className="list-item" type="button" key={item.id} onClick={() => { setReadingId(item.id); setOfficialValue(String(item.official_value ?? item.corrected_value ?? item.extracted_value ?? '')) }}><span>{item.reading_date}</span><strong>{item.official_value ?? item.corrected_value ?? item.extracted_value ?? '—'}</strong><span>{item.validation_status}</span></button>)}</div>
          <div className="grid"><label>القيمة المستخرجة / المقترحة<input type="number" min="0" value={extractedValue} onChange={(event) => setExtractedValue(event.target.value)} /></label><label>القيمة الرسمية للاعتماد<input type="number" min="0" value={officialValue} onChange={(event) => setOfficialValue(event.target.value)} /></label><label>تاريخ القراءة<input type="date" value={readingDate} onChange={(event) => setReadingDate(event.target.value)} /></label><label>صورة الدليل<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)} /></label><button type="button" onClick={() => void uploadEvidence()} disabled={!evidenceFile || loading}>رفع الدليل وإنشاء سجله</button><button type="button" onClick={() => void createReading()} disabled={loading}>تسجيل القراءة المقترحة</button></div>
          <p className="hint">القيمة المستخرجة تُسجّل كقراءة مقترحة، بينما القيمة الرسمية تُستخدم عند الاعتماد فقط.</p>{evidenceId && <p>معرف سجل الدليل: {evidenceId}</p>}<button type="button" onClick={() => void validateAndBill()} disabled={!selectedReading || loading}>اعتماد القراءة وإصدار الفاتورة</button>{selectedReading && <p>القراءة المختارة: {selectedReading.id}</p>}
        </>}
      </section>
      {billing && <section className="panel"><h2>نتيجة الفوترة من الخادم</h2><div className="result">{Object.entries(billing).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value ?? '—')}</strong></div>)}</div><p className="hint">القيم المعروضة من invoice وreceivable وaudit_events بعد تنفيذ RPC الخادمية.</p></section>}
    </>}
    {message && <p className="error">{message}</p>}
  </main>
}
