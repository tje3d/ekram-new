import { PrismaClient } from '@prisma/client'

export default class DBService {
  prisma = new PrismaClient()

  constructor() {
    this.prisma.$connect()
  }
}
