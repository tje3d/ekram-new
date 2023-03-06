import jwt from 'jsonwebtoken'

export default class JWTService {
  secret = '#6n%WBGgbJaBqz^6x!P6YDr#myfmt*AeXd&DjsbpPu4hY'

  signOptions: jwt.SignOptions = {
    expiresIn: '3d',
  }

  verifyOptions: jwt.VerifyOptions = {}

  async sign(userId: number, options?: Partial<jwt.SignOptions>) {
    return jwt.sign({ userId }, this.secret, {
      ...this.signOptions,
      ...options,
    })
  }

  async verify(token: string) {
    return jwt.verify(
      token,
      this.secret,
      this.verifyOptions,
    ) as jwt.JwtPayload & { userId: number }
  }
}
