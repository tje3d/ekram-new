import bcrypt from 'bcryptjs'

export default class HashService {
  /**
   * Hash a string
   * @param input String
   * @returns String
   */
  async hash(input: string): Promise<string> {
    return bcrypt.hash(input, 10)
  }

  /**
   * Check password against hashed one
   * @param password String
   * @param hash String
   * @returns boolean
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compareSync(password, hash)
  }
}
