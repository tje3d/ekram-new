import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import dayjs from 'dayjs'
import { z } from 'zod'
import Container from '/src/di/di.base'
import { db } from '/src/helpers'
import HashService from '/src/services/hash.service'
import { adminProcedure, router } from '/src/trpc'

const create = adminProcedure
  .input(
    z
      .object({
        name: z.string(),
        username: z.string(),
        password: z.string(),
        passwordConfirm: z.string(),
        roleId: z.number().nonnegative().min(1),
        permissions: z.number().nonnegative().min(1).array().optional(),
        gateId: z.number().nonnegative().min(1).optional(),
        bakhshId: z.number().nonnegative().min(1).array().optional(),
      })
      .refine((data) => data.password === data.passwordConfirm, {
        message: 'تکرار رمزعبور صحیح نیست',
      })
      .refine((data) => (data.roleId === 2 ? !!data.gateId : true), {
        message: 'لطفا یک گیت انتخاب کنید',
      })
      .refine(
        async (data) =>
          data.gateId
            ? !(await db().userHasGate.findFirst({
                where: { gateId: data.gateId },
              }))
            : true,
        {
          message: 'قبلا برای این گیت کاربر ایجاد شده است',
        },
      )
      .refine(
        (data) =>
          data.roleId === 3
            ? !!data.bakhshId && data.bakhshId.length > 0
            : true,
        {
          message: 'لطفا یک بخش انتخاب کنید',
        },
      )
      .refine(
        async (data) => {
          return !(await db().user.findFirst({
            where: { username: data.username },
          }))
        },
        { message: 'نام کاربری قبلا ثبت شده است' },
      )
      .refine(
        async (data) => {
          return (
            !data.roleId ||
            !!(await db().role.findFirst({
              where: { id: data.roleId },
            }))
          )
        },
        { message: 'سطح دسترسی معتبر نیست', path: ['roleId'] },
      )
      .refine(
        async (data) => {
          return (
            !data.permissions ||
            data.permissions.length === 0 ||
            (await db().permission.count({
              where: {
                id: {
                  in: data.permissions,
                },
              },
            })) === data.permissions.length
          )
        },
        { message: 'یک یا چند دسترسی معتبر نیست' },
      )
      .refine(
        async (data) => {
          return (
            !data.gateId ||
            !!(await db().gate.findFirst({
              where: { id: data.gateId },
            }))
          )
        },
        { message: 'گیت معتبر نیست', path: ['gateId'] },
      )
      .refine(
        async (data) => {
          return (
            !data.bakhshId ||
            data.bakhshId.length === 0 ||
            (await db().bakhsh.count({
              where: { id: { in: data.bakhshId } },
            })) === data.bakhshId.length
          )
        },
        { message: 'بخش معتبر نیست', path: ['bakhshId'] },
      ),
  )
  .mutation(async ({ input }) => {
    const user = await db().user.create({
      data: {
        name: input.name,
        password: await Container.get(HashService).hash(input.password),
        username: input.username,
        UserHasGate: input.gateId
          ? { create: { gateId: input.gateId } }
          : undefined,
        UserHasRole: {
          create: {
            roleId: input.roleId,
          },
        },
        UserHasPermissions: input.permissions
          ? {
              createMany: {
                data: input.permissions.map((permissionId) => ({
                  permissionId,
                })),
              },
            }
          : undefined,
        UserHasBakhsh: input.bakhshId
          ? {
              createMany: {
                data: input.bakhshId.map((bakhshId) => ({ bakhshId })),
              },
            }
          : {},
      },
    })

    return {
      id: user.id,
      name: user.name,
      username: user.username,
    }
  })

const forceLogout = adminProcedure
  .input(
    z.number().refine(
      async (userId) => {
        return (
          !userId || !!(await db().user.findFirst({ where: { id: userId } }))
        )
      },
      { message: 'کاربر یافت نشد' },
    ),
  )
  .mutation(async ({ input }) => {
    await db().user.update({
      where: { id: input },
      data: { logoutBefore: dayjs().format('YYYY-MM-DD HH:mm:ss') },
    })
  })

const list = adminProcedure
  .input(
    z.object({
      page: z.number(),
      perPage: z.number().multipleOf(5),
      search: z
        .object({
          id: z.number().optional(),
          name: z.string().optional(),
          username: z.string().optional(),
          gateName: z.string().optional(),
        })
        .optional(),
    }),
  )
  .query(async ({ input }) => {
    const where: Prisma.UserWhereInput = input.search
      ? {
          AND: [
            { id: { equals: input.search.id } },
            { name: { contains: input.search.name } },
            { username: { contains: input.search.username } },
            input.search.gateName
              ? {
                  UserHasGate: {
                    Gate: { name: { contains: input.search.gateName } },
                  },
                }
              : {},
          ],
        }
      : {}

    const total = await db().user.count({ where })
    const data = await db().user.findMany({
      take: input.perPage,
      skip: (input.page - 1) * input.perPage,
      include: {
        UserHasRole: {
          include: {
            Role: true,
          },
        },
        UserHasGate: {
          include: {
            Gate: true,
          },
        },
        UserHasBakhsh: {
          include: {
            Bakhsh: true,
          },
        },
      },
      where,
    })

    return {
      total,
      page: input.page,
      perPage: input.perPage,
      data: data.map((user) => {
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.UserHasRole?.Role,
          gate: user.UserHasGate?.Gate,
          bakhsh: user.UserHasBakhsh?.map((row) => row.Bakhsh),
          lastSeen: user.lastSeen ? user.lastSeen : null,
        }
      }),
    }
  })

const remove = adminProcedure.input(z.number()).mutation(async ({ input }) => {
  await db().user.delete({ where: { id: input } })
})

const edit = adminProcedure
  .input(
    z
      .object({
        id: z.number(),
        name: z.string(),
        username: z.string(),
        password: z.string().optional(),
        passwordConfirm: z.string().optional(),
        roleId: z.number().nonnegative().min(1),
        permissions: z.number().nonnegative().min(1).array().optional(),
        gateId: z.number().nonnegative().min(1).optional(),
        bakhshId: z.number().nonnegative().min(1).array().optional(),
      })
      .refine(
        (data) =>
          data.password ? data.password === data.passwordConfirm : true,
        {
          message: 'تکرار رمزعبور صحیح نیست',
        },
      )
      .refine((data) => (data.roleId === 2 ? !!data.gateId : true), {
        message: 'لطفا یک گیت انتخاب کنید',
      })
      .refine(
        (data) =>
          data.roleId === 3
            ? !!data.bakhshId && data.bakhshId.length > 0
            : true,
        {
          message: 'لطفا یک بخش انتخاب کنید',
        },
      )
      .refine(
        async (data) => {
          return (
            !data.roleId ||
            !!(await db().role.findFirst({
              where: { id: data.roleId },
            }))
          )
        },
        { message: 'سطح دسترسی معتبر نیست', path: ['roleId'] },
      )
      .refine(
        async (data) => {
          return (
            !data.permissions ||
            data.permissions.length === 0 ||
            (await db().permission.count({
              where: {
                id: {
                  in: data.permissions,
                },
              },
            })) === data.permissions.length
          )
        },
        { message: 'یک یا چند دسترسی معتبر نیست' },
      )
      .refine(
        async (data) => {
          return (
            !data.gateId ||
            !!(await db().gate.findFirst({
              where: { id: data.gateId },
            }))
          )
        },
        { message: 'گیت معتبر نیست', path: ['gateId'] },
      )
      .refine(
        async (data) => {
          return (
            !data.bakhshId ||
            data.bakhshId.length === 0 ||
            (await db().bakhsh.count({
              where: { id: { in: data.bakhshId } },
            })) === data.bakhshId.length
          )
        },
        { message: 'بخش معتبر نیست', path: ['bakhshId'] },
      ),
  )
  .mutation(async ({ input }) => {
    const user = await db().user.findFirst({
      where: { id: input.id },
      include: { UserHasGate: true },
    })

    if (!user) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['id'],
            message: 'کاربر یافت نشد',
          },
        ]).toString(),
      })
    }

    if (
      input.username !== user.username &&
      !!(await db().user.findFirst({
        where: {
          name: input.name,
        },
      }))
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['name'],
            message: 'نام کاربری قبلا ثبت شده است',
          },
        ]).toString(),
      })
    }

    if (
      input.gateId &&
      user.UserHasGate &&
      input.gateId !== user.UserHasGate.gateId &&
      !!(await db().userHasGate.findFirst({
        where: {
          gateId: input.gateId,
        },
      }))
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['name'],
            message: 'قبلا برای این گیت کاربر تعریف شده است',
          },
        ]).toString(),
      })
    }

    if (input.permissions) {
      await db().userHasPermissions.deleteMany({
        where: {
          userId: user.id,
          permissionId: {
            notIn: input.permissions,
          },
        },
      })
    }

    if (input.bakhshId) {
      await db().userHasBakhsh.deleteMany({
        where: {
          userId: user.id,
          bakhshId: {
            notIn: input.bakhshId,
          },
        },
      })
    }

    if (!input.gateId && user.UserHasGate) {
      await db().userHasGate.delete({ where: { userId: user.id } })
    }

    await db().user.update({
      where: { id: input.id },
      data: {
        name: input.name,
        username: input.username,
        password: input.password
          ? await Container.get(HashService).hash(input.password)
          : undefined,
        UserHasGate: input.gateId
          ? {
              upsert: {
                create: { gateId: input.gateId },
                update: { gateId: input.gateId },
              },
            }
          : undefined,
        UserHasRole: {
          upsert: {
            create: {
              roleId: input.roleId,
            },
            update: {
              roleId: input.roleId,
            },
          },
        },
        UserHasPermissions: input.permissions
          ? {
              createMany: {
                data: input.permissions.map((permissionId) => ({
                  permissionId,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
        UserHasBakhsh: input.bakhshId
          ? {
              createMany: {
                skipDuplicates: true,
                data: input.bakhshId.map((bakhshId) => ({ bakhshId })),
              },
            }
          : {},
      },
    })
  })

export const userRouter = router({
  create,

  edit,

  remove,

  list,

  forceLogout,
})
