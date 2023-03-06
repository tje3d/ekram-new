import dayjs from 'dayjs'
import Container from '/src/di/di.base'
import { AuthUser } from '/src/entities/auth-user.entity'
import { db } from '/src/helpers'
import JWTService from '/src/services/jwt.service'
import { privateProcedure, router } from '/src/trpc'

const info = privateProcedure.mutation(async ({ ctx }) => {
  const user = ctx.user!

  let newToken

  if (dayjs().diff(dayjs(ctx.jwtPayload!.iat! * 1000), 'm') >= 30) {
    newToken = await Container.get(JWTService).sign(user.id, {
      expiresIn: user.UserHasRole!.roleId === 2 ? '6h' : '3d',
    })
  }

  const role = user.UserHasRole!.Role

  return new AuthUser({
    id: user.id,
    name: user.name,
    username: user.username,
    role,
    gate: user.UserHasGate?.Gate,
    permissions: user.UserHasPermissions.map((hasPerm) => hasPerm.Permission),
    token: newToken || ctx.token!,
  })
})

const updateLastSeen = privateProcedure.mutation(async ({ ctx }) => {
  const user = ctx.user!

  await db().user.update({
    where: { id: user.id },
    data: { lastSeen: dayjs().format('YYYY-MM-DD HH:mm:ss') },
  })
})

export const profileRouter = router({
  info,

  updateLastSeen,
})
