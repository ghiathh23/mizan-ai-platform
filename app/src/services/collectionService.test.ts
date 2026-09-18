import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}))

import { collectionService } from './collectionService'

describe('collectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps record input to the actual collection RPC contract', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: 'collection-id', error: null })
    await expect(collectionService.record({ project_id: 'project-id', invoice_id: 'invoice-id', amount: 125, payment_method: 'cash', reference_number: '  receipt-1 ', notes: '  paid  ', idempotency_key: 'idem-key-1' })).resolves.toBe('collection-id')
    expect(mocks.rpc).toHaveBeenCalledWith('mizan_record_collection', expect.objectContaining({ p_project_id: 'project-id', p_invoice_id: 'invoice-id', p_amount: 125, p_payment_method: 'cash', p_idempotency_key: 'idem-key-1', p_reference_number: 'receipt-1', p_notes: 'paid' }))
  })

  it('propagates record errors', async () => {
    const error = new Error('rpc_failed')
    mocks.rpc.mockResolvedValueOnce({ data: null, error })
    await expect(collectionService.record({ project_id: 'p', invoice_id: 'i', amount: 1, payment_method: 'cash' })).rejects.toBe(error)
  })

  it('rejects an empty void reason before calling RPC', async () => {
    await expect(collectionService.void('collection-id', '   ')).rejects.toThrow('collection_void_reason_required')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('maps void requests without requiring a return value', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null })
    await expect(collectionService.void('collection-id', '  تصحيح  ', '00000000-0000-4000-8000-000000000001')).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith('mizan_void_collection', { p_collection_id: 'collection-id', p_reason: 'تصحيح', p_operation_id: '00000000-0000-4000-8000-000000000001' })
  })
})
