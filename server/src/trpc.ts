import { initTRPC, TRPCError } from '@trpc/server'
import { createContext } from '/src/context'

export const t = initTRPC.context<typeof createContext>().create()

const isLoggedIn = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next()
})

const roleMiddleware = (ids: number[]) => {
  return t.middleware(async ({ ctx, next }) => {
    if (
      !ctx.user ||
      !ctx.user.UserHasRole ||
      ids.indexOf(ctx.user.UserHasRole.roleId) === -1
    ) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    return next()
  })
}

export const middleware = t.middleware
export const router = t.router
export const publicProcedure = t.procedure
export const privateProcedure = publicProcedure.use(isLoggedIn)
export const adminProcedure = privateProcedure.use(roleMiddleware([1]))
export const sarparastProcedure = privateProcedure.use(roleMiddleware([3]))
export const sarparastOrAdminProcedure = privateProcedure.use(
  roleMiddleware([1, 3]),
)
export const mergeRouters = t.mergeRouters
