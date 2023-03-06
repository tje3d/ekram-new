import { authRouter } from '/src/routers/auth.router'
import { bakhshRouter } from '/src/routers/bakhsh.router'
import { gateRouter } from '/src/routers/gate.router'
import { profileRouter } from '/src/routers/profile.router'
import { sarparastRouter } from '/src/routers/sarparast.router'
import { userRouter } from '/src/routers/user.router'
import { router } from '/src/trpc'

export const appRouter = router({
  user: userRouter,
  auth: authRouter,
  profile: profileRouter,
  gate: gateRouter,
  bakhsh: bakhshRouter,
  sarparast: sarparastRouter,
})

export type AppRouter = typeof appRouter
