import { inferAsyncReturnType, TRPCError } from '@trpc/server'
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import dayjs from 'dayjs'
import jwt from 'jsonwebtoken'
import Container from '/src/di/di.base'
import { db } from '/src/helpers'
import JWTService from '/src/services/jwt.service'

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const token = req.headers['x-token'] as string | undefined

  let user
  let jwtPayload: undefined | (jwt.JwtPayload & { userId: number })

  try {
    if (token && typeof token === 'string') {
      jwtPayload = await Container.get(JWTService).verify(token)
    }
  } catch (error) {}

  try {
    if (jwtPayload) {
      user = await db().user.findFirst({
        where: { id: jwtPayload.userId },
        include: {
          UserHasGate: {
            include: {
              Gate: true,
            },
          },
          UserHasPermissions: {
            include: {
              Permission: true,
            },
          },
          UserHasRole: {
            include: {
              Role: true,
            },
          },
        },
      })

      if (
        user &&
        user.logoutBefore &&
        dayjs(user.logoutBefore).isAfter(dayjs(jwtPayload.iat! * 1000))
      ) {
        user = undefined
      }

      // Expire controltaradod tokens daily
      if (user?.UserHasRole?.roleId === 2) {
        if (!dayjs(jwtPayload.iat! * 1000).isSame(dayjs(), 'day')) {
          user = undefined
        }
      }
    }
  } catch (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
    })
  }

  return { user, token, jwtPayload }
}

export type Context = inferAsyncReturnType<typeof createContext>
