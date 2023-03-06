import { PrismaClient } from '@prisma/client'
import HashService from '../src/services/hash.service'

const prisma = new PrismaClient()

async function main() {
  await permissions()
  await roles()
  await users()
  await bakhsh()
  await settings()
}

async function permissions() {
  return prisma.permission.createMany({
    data: [
      {
        name: 'ثبت خروج',
      },
      {
        name: 'ثبت تردد بدون درنظر گرفتن تاریخ',
      },
    ],
  })
}

async function roles() {
  return prisma.role.createMany({
    data: [
      {
        name: 'مدیر',
      },
      {
        name: 'کنترل تردد',
      },
      {
        name: 'سرپرست',
      },
      {
        name: 'سرکشیک',
      },
    ],
  })
}

async function users() {
  const hashService = new HashService()
  const password = await hashService.hash('123456')

  const user = await prisma.user.create({
    data: {
      name: 'مدیر',
      username: 'tje3d',
      password,
    },
  })

  await prisma.userHasRole.create({
    data: {
      roleId: 1,
      userId: user.id,
    },
  })
}

async function bakhsh() {
  const bakhsh = await prisma.bakhsh.create({
    data: {
      name: 'بی‌نام',
      start: '12:00',
      tedad: 100,
    },
  })

  await prisma.bakhshCodes.createMany({
    data: [
      {
        bakhshId: bakhsh.id,
        code: 540,
      },
      {
        bakhshId: bakhsh.id,
        code: 450,
      },
    ],
  })
}

async function settings() {
  await prisma.settings.createMany({
    data: [
      {
        key: 'SMS_START_TIME',
        value: '19:30',
      },
      {
        key: 'SMS_END_TIME',
        value: '21:30',
      },
      {
        key: 'SMS_FAST_TIME',
        value: '21:00',
      },
      {
        key: 'SMS_INTERVAL_NORMAL',
        value: '15',
      },
      {
        key: 'SMS_INTERVAL_FAST',
        value: '5',
      },
      {
        key: 'SMS_RECIPIENT_NORMAL',
        value: '09338978135\n0915000000',
      },
      {
        key: 'SMS_RECIPIENT_FAST',
        value: '09338978135\n0915000000',
      },
      {
        key: 'CONTROLTARADOD_START',
        value: '16:00',
      },
      {
        key: 'CONTROLTARADOD_END',
        value: '23:00',
      },
    ],
  })
}

main()
