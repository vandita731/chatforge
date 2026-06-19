// convert string to bytes
const encode = (text: string) => new TextEncoder().encode(text)

// hash a password using PBKDF2
export async function hashPassword(password: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encode('chatforge-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

// compare a plain password with a stored hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password)
  return newHash === hash
}