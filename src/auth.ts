import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

/**
 * Admin authentication (single account, credentials).
 *
 * Environment:
 *   AUTH_EMAIL          admin login
 *   AUTH_PASSWORD_HASH  preferred — PBKDF2 hash produced by `node scripts/hash-password.mjs`
 *                       (format: pbkdf2$<iterations>$<salt-b64>$<hash-b64>)
 *   AUTH_PASSWORD       legacy plain-text fallback, used only when no hash is set
 *
 * Only Web Crypto is used so this module stays loadable from the middleware
 * (Edge-compatible) as well as from the Node route handler.
 */

const encoder = new TextEncoder()

/** Constant-time comparison of two byte arrays (no early exit on mismatch). */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const length = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function verifyPbkdf2(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsRaw, saltB64, hashB64] = stored.split("$")
  if (scheme !== "pbkdf2" || !iterationsRaw || !saltB64 || !hashB64) return false
  const iterations = Number(iterationsRaw)
  if (!Number.isInteger(iterations) || iterations < 1000) return false

  const expected = base64ToBytes(hashB64)
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltB64), iterations },
    key,
    expected.length * 8
  )
  return constantTimeEqual(new Uint8Array(bits), expected)
}

async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.AUTH_PASSWORD_HASH?.trim()
  if (hash) {
    return verifyPbkdf2(password, hash)
  }
  const plain = process.env.AUTH_PASSWORD
  if (!plain) return false
  return constantTimeEqual(encoder.encode(password), encoder.encode(plain))
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      authorize: async (credentials) => {
        const validEmail = process.env.AUTH_EMAIL?.trim().toLowerCase()
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : ""
        const password = typeof credentials?.password === "string" ? credentials.password : ""

        if (!validEmail || !email || !password) {
          return null
        }

        // Always run the password check, even when the email does not match,
        // so the response time does not reveal whether the login exists.
        const emailOk = constantTimeEqual(encoder.encode(email), encoder.encode(validEmail))
        const passwordOk = await verifyPassword(password)

        if (!(emailOk && passwordOk)) {
          // Never log the submitted credentials nor the expected login.
          console.warn("[AUTH] Échec de connexion")
          return null
        }

        return {
          id: "1",
          email: validEmail,
          name: "Admin",
          role: "owner"
        }
      }
    })
  ],
  session: {
    // Admin sessions expire after 7 days (NextAuth default is 30).
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.role = (user as { role?: string }).role
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        ;(session.user as { role?: string }).role = token.role as string
        // Stable id used as `sub` in the Convex token.
        ;(session.user as { id?: string }).id = typeof token.sub === "string" ? token.sub : "1"
      }
      return session
    }
  },
  pages: {
    signIn: "/admin/login"
  }
})
