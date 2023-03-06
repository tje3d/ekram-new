import { Gate, Permission, Role } from '@prisma/client'

export class AuthUser {
  id!: number
  name!: string
  username!: string
  permissions?: Permission[]
  role!: Role
  gate?: Omit<Gate, 'createdAt' | 'updatedAt'>
  token!: string

  constructor(input: AuthUser) {
    Object.assign(this, input)
  }
}
