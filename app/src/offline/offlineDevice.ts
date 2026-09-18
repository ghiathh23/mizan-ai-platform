const DEVICE_STORAGE_KEY = 'mizan-ai-device-id'

export function getPersistentDeviceId(createId: () => string): string {
  if (typeof localStorage === 'undefined') return createId()

  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (existing) return existing

    const created = createId()
    localStorage.setItem(DEVICE_STORAGE_KEY, created)
    return created
  } catch {
    // Private browsing or storage restrictions must not silently create an invalid ID.
    return createId()
  }
}
