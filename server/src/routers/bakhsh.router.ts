import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { db } from '/src/helpers'
import { adminProcedure, router } from '/src/trpc'

const create = adminProcedure
  .input(
    z
      .object({
        name: z.string(),
        tedad: z.number(),
        contact: z.string().optional(),
        start: z.string().regex(/\d{2}:\d{2}/),
        codes: z.string().array(),
      })
      .refine(
        async (data) => {
          return !(await db().bakhsh.findFirst({
            where: { name: data.name },
          }))
        },
        { message: 'بخش قبلا ثبت شده است' },
      ),
  )
  .mutation(async ({ input }) => {
    const codeResult = await db().bakhshCodes.findMany({
      where: { code: { in: input.codes } },
    })

    if (codeResult.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['codes'],
            message: `کد ${codeResult
              .map((i) => i.code)
              .join(', ')} قبلا ثبت شده است`,
          },
        ]).toString(),
      })
    }

    await db().bakhsh.create({
      data: {
        name: input.name,
        tedad: input.tedad,
        contact: input.contact,
        start: input.start,
        BakhshCodes: {
          createMany: {
            data: input.codes.map((code) => ({ code })),
          },
        },
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
          contact: z.string().optional(),
          start: z.string().optional(),
          code: z.string().optional(),
        })
        .optional(),
    }),
  )
  .query(async ({ input }) => {
    const where: Prisma.BakhshWhereInput = input.search
      ? {
          AND: [
            { id: { equals: input.search.id } },
            { name: { contains: input.search.name } },
            { contact: { contains: input.search.contact } },
            { start: { contains: input.search.start } },
            input.search.code
              ? {
                  BakhshCodes: {
                    some: {
                      code: { contains: input.search.code },
                    },
                  },
                }
              : {},
          ],
        }
      : {}

    const total = await db().bakhsh.count({ where })
    const data = await db().bakhsh.findMany({
      take: input.perPage,
      skip: (input.page - 1) * input.perPage,
      include: {
        BakhshCodes: true,
      },
      where,
    })

    return {
      total,
      page: input.page,
      perPage: input.perPage,
      data: data.map((bakhsh) => {
        return {
          id: bakhsh.id,
          name: bakhsh.name,
          tedad: bakhsh.tedad,
          start: bakhsh.start,
          codes: bakhsh.BakhshCodes.map((i) => i.code),
        }
      }),
    }
  })

const remove = adminProcedure.input(z.number()).mutation(async ({ input }) => {
  await db().bakhsh.delete({ where: { id: input } })
})

export const bakhshRouter = router({
  create,

  list,

  remove,
})
