import { Error, TaradodNote, TaradodTotal } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import dayjs from 'dayjs'
import { z } from 'zod'
import { db } from '/src/helpers'
import { router, sarparastOrAdminProcedure } from '/src/trpc'

const listGates = sarparastOrAdminProcedure.query(async ({ ctx }) => {
  const watch = await db().userWatchGates.findMany({
    where: { userId: ctx.user!.id },
  })

  return {
    gates: await db().gate.findMany(),
    watchList: watch.map((item) => item.gateId),
  }
})

const entekhab = sarparastOrAdminProcedure
  .input(z.object({ gateId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    if (!(await db().gate.findFirst({ where: { id: input.gateId } }))) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: new z.ZodError([
          {
            code: 'custom',
            path: ['gateId'],
            message: 'گیت یافت نشد',
          },
        ]).toString(),
      })
    }

    const has = await db().userWatchGates.count({
      where: { userId: ctx.user!.id, gateId: input.gateId },
    })

    if (has) {
      await db().userWatchGates.delete({
        where: {
          userId_gateId: {
            userId: ctx.user!.id,
            gateId: input.gateId,
          },
        },
      })
    } else {
      await db().userWatchGates.create({
        data: {
          userId: ctx.user!.id,
          gateId: input.gateId,
        },
      })
    }
  })

const stats = sarparastOrAdminProcedure.query(async ({ ctx }) => {
  const user = ctx.user!

  const gates = (
    await db().userWatchGates.findMany({
      where: { userId: user.id },
    })
  ).map((item) => item.gateId)

  let taradods: TaradodTotal[] = []
  let hints: TaradodNote[] = []
  let errors: Error[] = []

  if (gates.length !== 0) {
    const today = dayjs().format('YYYY-MM-DD')

    taradods = await db().taradodTotal.findMany({
      where: {
        date: {
          equals: today,
        },
        gateId: {
          in: gates,
        },
      },
    })

    hints = await db().taradodNote.findMany({
      where: {
        dateTime: {
          startsWith: today,
        },
        gateId: {
          in: gates,
        },
        checkedBy: {
          equals: null,
        },
      },
    })

    errors = await db().error.findMany({
      where: {
        dateTime: {
          startsWith: today,
        },
        gateId: {
          in: gates,
        },
        checkedBy: {
          equals: null,
        },
      },
    })
  }

  return { taradods, hints, errors }
})

const editname = sarparastOrAdminProcedure
  .input(z.object({ userId: z.number(), name: z.string().optional() }).array())
  .mutation(async ({ input }) => {
    for (const key in input) {
      const item = input[key]

      if (!item.name) {
        continue
      }

      const user = await db().user.findFirst({
        where: { id: item.userId },
        include: { UserHasGate: true },
      })

      if (!user || user.name === item.name) {
        continue
      }

      await db().user.update({
        data: { name: item.name },
        where: { id: user.id },
      })

      if (user.UserHasGate) {
        await db().taradodTotal.update({
          where: {
            gateId_date: {
              date: dayjs().format('YYYY-MM-DD'),
              gateId: user.UserHasGate.gateId,
            },
          },
          data: {
            userName: item.name,
          },
        })
      }
    }
  })

export const sarparastRouter = router({
  listGates,

  entekhab,

  stats,

  editname,
})
