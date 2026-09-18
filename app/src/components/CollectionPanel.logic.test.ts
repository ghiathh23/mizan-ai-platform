import { describe, expect, it } from 'vitest'
import { isCollectionReady, isVoidReasonValid } from './collectionPanelLogic'

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

describe('isVoidReasonValid', () => {
  it('rejects blank and short reasons', () => {
    expect(isVoidReasonValid('   ')).toBe(false)
    expect(isVoidReasonValid('1234')).toBe(false)
  })

  it('accepts five or more non-whitespace characters', () => {
    expect(isVoidReasonValid('12345')).toBe(true)
    expect(isVoidReasonValid('  تصحيح  ')).toBe(true)
  })
})
