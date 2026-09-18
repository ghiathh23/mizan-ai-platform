import { describe, expect, it, vi } from 'vitest'

const list = vi.fn()
const record = vi.fn()

vi.mock('../services/collectionService', () => ({
  collectionService: { list, record },
}))

import { render, screen } from '@testing-library/react'
import { CollectionPanel } from './CollectionPanel'

describe('CollectionPanel', () => {
  it('requires an invoice before enabling collection', () => {
    list.mockResolvedValueOnce([])
    render(<CollectionPanel projectId="project-id" invoiceId={null} />)
    expect(screen.getByRole('button', { name: 'تسجيل التحصيل' })).toBeDisabled()
  })
})
