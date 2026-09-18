import { supabase } from '../lib/supabase'

export type StaffRoleCode = 'project_manager' | 'field_operator' | 'collector'

export interface StaffOnboardingInput {
  organization_id: string
  project_id: string
  role_code: StaffRoleCode
  email: string
  display_name?: string | null
}

export const staffOnboardingService = {
  async register(input: StaffOnboardingInput): Promise<string> {
    const { data, error } = await supabase.rpc('mizan_register_staff_onboarding', {
      p_organization_id: input.organization_id,
      p_project_id: input.project_id,
      p_role_code: input.role_code,
      p_email: input.email.trim(),
      p_display_name: input.display_name?.trim() || null,
    })

    if (error) throw error
    if (!data) throw new Error('staff_onboarding_missing_id')
    return data as string
  },
}
