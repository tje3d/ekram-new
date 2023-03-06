import { GateType, Gender, Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '/src/helpers'
import { adminProcedure, router } from '/src/trpc'

const create = adminProcedure
  .input(
    z
      .object({
        name: z.string(),
        location: z.string(),
        // @ts-ignore
        gender: z.enum([...Object.keys(Gender)]),
        // @ts-ignore
        type: z.enum([...Object.keys(GateType)]),
      })
      .refine(
        async (data) =>
          !(await db().gate.findFirst({ where: { name: data.name } })),
        {
          message: 'نام گیت تکراریست',
        },
      ),
  )
  .mutation(async ({ input }) => {
    await db().gate.create({
      data: {
        name: input.name,
        location: input.location,
        gender: input.gender as Gender,
        type: input.type as GateType,
      },
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
          location: z.string().optional(),
          // @ts-ignore
          gender: z.enum([...Object.keys(Gender)]).optional(),
          // @ts-ignore
          type: z.enum([...Object.keys(GateType)]).optional(),
        })
        .optional(),
    }),
  )
  .query(async ({ input }) => {
    const where: Prisma.GateWhereInput = input.search
      ? {
          AND: [
            { id: { equals: input.search.id } },
            { name: { contains: input.search.name } },
            { location: { contains: input.search.location } },
            { gender: { equals: input.search.gender as Gender } },
            { type: { equals: input.search.type as GateType } },
          ],
        }
      : {}

    const total = await db().gate.count({ where })
    const data = await db().gate.findMany({
      take: input.perPage,
      skip: (input.page - 1) * input.perPage,
      include: {
        UserHasGate: {
          include: {
            User: true,
          },
        },

        UserWatchGates: {
          include: {
            User: true,
          },
        },
      },
      where,
    })

    return {
      total,
      page: input.page,
      perPage: input.perPage,
      data: data.map((gate) => {
        return {
          id: gate.id,
          name: gate.name,
          location: gate.location,
          gender: gate.gender,
          type: gate.type,

          user: gate.UserHasGate[0]?.User,
          sarparasts: gate.UserWatchGates,
        }
      }),
    }
  })

const remove = adminProcedure.input(z.number()).mutation(async ({ input }) => {
  await db().gate.delete({ where: { id: input } })
})

const edit = adminProcedure
  .input(
    z.object({
      id: z.number(),
      name: z.string(),
      location: z.string(),
      // @ts-ignore
      gender: z.enum([...Object.keys(Gender)]),
      // @ts-ignore
      type: z.enum([...Object.keys(GateType)]),
    }),
  )
  .mutation(async ({ input }) => {
    const gate = await db().gate.findFirst({ where: { id: input.id } })

    if (!gate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['id'],
            message: 'گیت یافت نشد',
          },
        ]).toString(),
      })
    }

    if (
      input.name !== gate.name &&
      !!(await db().gate.findFirst({
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
            message: 'نام قبلا ثبت شده است',
          },
        ]).toString(),
      })
    }

    await db().gate.update({
      where: { id: input.id },
      data: {
        name: input.name,
        location: input.location,
        type: input.type as GateType,
        gender: input.gender as Gender,
      },
    })
  })

export const gateRouter = router({
  create,

  remove,

  edit,

  list,
})
