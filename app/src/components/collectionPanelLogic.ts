export function isCollectionReady(projectId: string, invoiceId?: string | null, disabled = false): boolean {
  return Boolean(projectId && invoiceId && !disabled)
}

export function isVoidReasonValid(reason: string): boolean {
  return reason.trim().length >= 5
}
