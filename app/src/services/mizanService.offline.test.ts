import { beforeEach, describe, expect, it, vi } from 'vitest'

const getOfflineEvidence = vi.fn()
const queueOfflineReading = vi.fn()

vi.mock('../offline/offlineEvidence', () => ({ getOfflineEvidence }))
vi.mock('../offline/offlineReading', () => ({ queueOfflineReading }))
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
  },
}))

describe('mizanService offline reading evidence handling', () => {
  beforeEach(() => {
    vi.resetModules()
    getOfflineEvidence.mockReset()
    queueOfflineReading.mockReset()
    queueOfflineReading.mockResolvedValue('queued-reading-id')
    vi.stubGlobal('navigator', { onLine: false })
  })

  it('uses the server evidence id when local evidence is already synced', async () => {
    getOfflineEvidence.mockResolvedValue({
      evidence_id: 'local-evidence-id',
      server_evidence_id: 'server-evidence-id',
      sync_status: 'synced',
    })

    const { mizanService } = await import('./mizanService')
    const result = await mizanService.createReading({
      project_id: 'project-id',
      meter_id: 'meter-id',
      evidence_id: 'local-evidence-id',
      reading_at: '2026-09-18T10:00:00.000Z',
      extracted_value: 12,
    })

    expect(queueOfflineReading).toHaveBeenCalledWith({
      project_id: 'project-id',
      meter_id: 'meter-id',
      evidence_id: 'server-evidence-id',
      reading_at: '2026-09-18T10:00:00.000Z',
      extracted_value: 12,
    })
    expect(result.evidence_id).toBe('server-evidence-id')
  })

  it('still blocks unsynced local evidence', async () => {
    getOfflineEvidence.mockResolvedValue({
      evidence_id: 'local-evidence-id',
      server_evidence_id: null,
      sync_status: 'queued',
    })

    const { mizanService } = await import('./mizanService')

    await expect(mizanService.createReading({
      project_id: 'project-id',
      meter_id: 'meter-id',
      evidence_id: 'local-evidence-id',
      reading_at: '2026-09-18T10:00:00.000Z',
      extracted_value: 12,
    })).rejects.toThrow('offline_evidence_sync_required')
    expect(queueOfflineReading).not.toHaveBeenCalled()
  })
})
