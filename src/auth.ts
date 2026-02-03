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
        
        console.log("[AUTH] Tentative de connexion:", { 
          emailReçu: email, 
          emailAttendu: validEmail,
          passwordMatch: password === validPassword 
        })
        
        if (email === validEmail && password === validPassword) {
          console.log("[AUTH] Connexion réussie")
          return { 
            id: "1", 
            email: validEmail ?? "", 
            name: "Admin",
            role: "owner" 
          }
        }
        console.log("[AUTH] Échec de connexion")
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
