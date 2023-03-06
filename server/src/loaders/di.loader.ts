import { Observable } from 'rxjs'
import Container from '/src/di/di.base'
import { DateService } from '/src/services/date.service'
import DBService from '/src/services/db.service'
import HashService from '/src/services/hash.service'
import JWTService from '/src/services/jwt.service'

export default new Observable((observer) => {
  console.log('Loading DateService')
  Container.get(DateService)

  console.log('Loading DBService')
  Container.get(DBService)

  console.log('Loading HashService')
  Container.get(HashService)

  console.log('Loading JWTService')
  Container.get(JWTService)

  observer.next()
})
