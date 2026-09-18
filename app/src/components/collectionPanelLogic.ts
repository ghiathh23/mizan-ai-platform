export function isCollectionReady(projectId: string, invoiceId?: string | null, disabled = false): boolean {
  return Boolean(projectId && invoiceId && !disabled)
}
