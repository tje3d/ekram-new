import Container from '/src/di/di.base'
import DBService from '/src/services/db.service'

export function db() {
  return Container.get(DBService).prisma
}
