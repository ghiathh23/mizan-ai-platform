import { describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { rpc },
}))

import { staffOnboardingService } from './staffOnboardingService'

describe('staffOnboardingService.register', () => {
  it('maps the typed input to the onboarding RPC and returns the id', async () => {
    rpc.mockResolvedValueOnce({ data: 'onboarding-id', error: null })

    await expect(
      staffOnboardingService.register({
        organization_id: 'org-id',
        project_id: 'project-id',
        role_code: 'collector',
        email: '  staff@example.com  ',
        display_name: '  موظف ميداني  ',
      }),
    ).resolves.toBe('onboarding-id')

    expect(rpc).toHaveBeenCalledWith('mizan_register_staff_onboarding', {
      p_organization_id: 'org-id',
      p_project_id: 'project-id',
      p_role_code: 'collector',
      p_email: 'staff@example.com',
      p_display_name: 'موظف ميداني',
    })
  })

  it('propagates RPC errors', async () => {
    const error = new Error('rpc_failed')
    rpc.mockResolvedValueOnce({ data: null, error })

    await expect(
      staffOnboardingService.register({
        organization_id: 'org-id',
        project_id: 'project-id',
        role_code: 'field_operator',
        email: 'staff@example.com',
      }),
    ).rejects.toBe(error)
  })

  it('rejects an empty RPC result', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })

    await expect(
      staffOnboardingService.register({
        organization_id: 'org-id',
        project_id: 'project-id',
        role_code: 'project_manager',
        email: 'staff@example.com',
      }),
    ).rejects.toThrow('staff_onboarding_missing_id')
  })
})
