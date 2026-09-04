import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      authorize: async (credentials) => {
        const validEmail = process.env.AUTH_EMAIL
        const validPassword = process.env.AUTH_PASSWORD
        
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        
        if (email === validEmail && password === validPassword) {
          return { 
            id: "1", 
            email: validEmail ?? "", 
            name: "Admin",
            role: "owner" 
          }
        }
        // Échec : ne journaliser ni l'identifiant saisi ni l'identifiant attendu.
        console.warn("[AUTH] login_failed")
        return null
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.role = (user as { role?: string }).role
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) (session.user as { role?: string }).role = token.role as string
      return session
    }
  },
  pages: {
    signIn: "/admin/login"
  }
})
