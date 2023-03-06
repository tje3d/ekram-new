import { TRPCError } from '@trpc/server'
import dayjs from 'dayjs'
import { z } from 'zod'
import Container from '/src/di/di.base'
import { AuthUser } from '/src/entities/auth-user.entity'
import { db } from '/src/helpers'
import HashService from '/src/services/hash.service'
import JWTService from '/src/services/jwt.service'
import { publicProcedure, router } from '/src/trpc'

const login = publicProcedure
  .input(
    z.object({
      username: z.string(),
      password: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    const user = await db().user.findFirst({
      where: { username: input.username },
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

    if (!user) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['username'],
            message: 'نام کاربری یافت نشد',
          },
        ]).toString(),
      })
    }

    if (
      !(await Container.get(HashService).verify(
        input.password || '2060',
        user.password,
      ))
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['password'],
            message: 'رمزعبور اشتباه است',
          },
        ]).toString(),
      })
    }

    const role = user.UserHasRole!.Role

    if (role.id === 2) {
      await db().user.update({
        where: { id: user.id },
        data: {
          logoutBefore: dayjs()
            .subtract(1, 'second')
            .format('YYYY-MM-DD HH:mm:ss'),
        },
      })
    }

    const token = await Container.get(JWTService).sign(user.id, {
      expiresIn: role.id === 2 ? '6h' : '3d',
    })

    return new AuthUser({
      id: user.id,
      name: user.name,
      username: user.username,
      role,
      gate: user.UserHasGate?.Gate,
      permissions: user.UserHasPermissions.map((hasPerm) => hasPerm.Permission),
      token,
    })
  })

export const authRouter = router({
  login,
})
