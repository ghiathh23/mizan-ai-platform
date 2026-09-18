import { FormEvent, useState } from 'react'
import { staffOnboardingService, type StaffRoleCode } from '../services/staffOnboardingService'

interface StaffOnboardingPanelProps {
  organizationId: string
  projectId: string
  disabled?: boolean
  onMessage?: (message: string) => void
}

const roles: Array<{ value: StaffRoleCode; label: string }> = [
  { value: 'project_manager', label: 'مدير المشروع' },
  { value: 'field_operator', label: 'قارئ عدادات / مشغل ميداني' },
  { value: 'collector', label: 'محصل' },
]

export function StaffOnboardingPanel({ organizationId, projectId, disabled, onMessage }: StaffOnboardingPanelProps) {
  const [roleCode, setRoleCode] = useState<StaffRoleCode>('field_operator')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const id = await staffOnboardingService.register({
        organization_id: organizationId,
        project_id: projectId,
        role_code: roleCode,
        email,
        display_name: displayName,
      })
      setEmail('')
      setDisplayName('')
      onMessage?.(`تم تسجيل طلب تهيئة الموظف. المعرف: ${id}`)
    } catch (error) {
      onMessage?.(error instanceof Error ? error.message : 'تعذر تسجيل طلب الموظف.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel">
      <h2>تهيئة موظف للمشروع</h2>
      <p className="hint">يُسجّل الطلب فقط. لا يتم إنشاء حساب Auth أو إرسال كلمة مرور من الواجهة.</p>
      <form onSubmit={submit} className="grid">
        <label>
          الدور
          <select value={roleCode} onChange={(event) => setRoleCode(event.target.value as StaffRoleCode)} disabled={disabled || loading}>
            {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </label>
        <label>
          البريد الإلكتروني
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={disabled || loading} />
        </label>
        <label>
          الاسم الظاهر
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={disabled || loading} />
        </label>
        <button type="submit" disabled={disabled || loading || !organizationId || !projectId}>
          {loading ? 'جارٍ التسجيل…' : 'تسجيل طلب التهيئة'}
        </button>
      </form>
    </section>
  )
}
