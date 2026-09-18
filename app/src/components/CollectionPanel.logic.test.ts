import { describe, expect, it } from 'vitest'
import { isCollectionReady } from './collectionPanelLogic'

describe('isCollectionReady', () => {
  it('requires project and invoice context', () => {
    expect(isCollectionReady('', 'invoice')).toBe(false)
    expect(isCollectionReady('project', null)).toBe(false)
    expect(isCollectionReady('project', 'invoice')).toBe(true)
  })

  it('blocks disabled collection controls', () => {
    expect(isCollectionReady('project', 'invoice', true)).toBe(false)
  })
})
