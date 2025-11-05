export const runtime = "nodejs";

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/db/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { compareSync } from "bcrypt-ts-edge";
import type { NextAuthConfig } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const config = {
  trustHost:true,
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (credentials == null) return null;
        // Find user in DB
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
          },
        });
        // Check if user exists
        if (user && user.password) {
          const isMatch = compareSync(
            credentials.password as string,
            user.password
          );
          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        // If user does not exist or password is incorrect
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user, trigger, token }: any) {
      // Set user id from token
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.name = token.name;

      // console.log(token);

      // if there is an update, set the user name
      if (trigger === "update") {
        session.user.name = user.name;
      }
      return session;
    },
    async jwt({token, user, trigger, session}:any) {
      // Assign user fields to the token
      if(user){
        token.id = user.id;
        token.role = user.role;
        // If user has no name then use email
        if(user.name === "NO_NAME"){
          token.name = user.email!.split("@")[0];
        }
        // update the DB to reflect name
        await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            name: token.name
          }
        });
        if(trigger === "signIn" || trigger === "signUp"){
          const cookiesObject = await cookies();
          const sessionCartId = cookiesObject.get("sessionCartId")?.value;

          if(sessionCartId){
            const sessionCart = await prisma.cart.findFirst({
              where: {sessionCartId}
            });
            if(sessionCart){
              // Delete curent user cart
              await prisma.cart.deleteMany({
                where: { userId: user.id }
              });
              // Assign new cart
              await prisma.cart.update({
                where: {
                  id: sessionCart.id
                },
                data: {
                  userId: user.id
                }
              })
            }
          }
        }
      }
      // Handle session updates
      if(session?.user?.name && trigger){
        token.name = session.user.name;
      }
      return token;
    },
    async authorized({request, auth}: any){
      // Array of regex patterns for allowed routes
      const protectedPaths = [
        /\/shipping-address/,
        /\/payment-method/,
        /\/place-order/,
        /\/profile/,
        /\/user\/(.*)/,
        /\/order\/(.*)/,
        /\/admin/,
      ];

      // Get pathname from request url object

      const {pathname} = request.nextUrl;
      // Check if user is not authenticated and accessing a protected route
      if(!auth && protectedPaths.some(p => p.test(pathname))) return false;

      // Check for session cart cookie
      if(!request.cookies.get("sessionCartId")){
        // Generate new session cart id cookie
        const sessionCartId = crypto.randomUUID();
        // Clone the request headers
        const newRequestHeaders = new Headers(request.headers);
        // Create a new response and add new headers
        const response = NextResponse.next({
          request: {
            headers: newRequestHeaders,
          },
        });
        // Set newly generated sessionCartId cookie
        response.cookies.set("sessionCartId", sessionCartId);
        return response
      }else {
        return true
      }
    }
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
