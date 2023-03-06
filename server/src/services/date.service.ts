import dayjs from 'dayjs'
import 'dayjs/locale/fa'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import jalaliday from 'jalaliday'

export class DateService {
  constructor() {
    dayjs.extend(customParseFormat)
    dayjs.extend(jalaliday)
    // dayjs.locale('fa')
    // @ts-ignore
    // dayjs.calendar('jalali')
    dayjs.extend(relativeTime)
    dayjs.extend(utc)
    dayjs.extend(timezone)
    dayjs.tz.setDefault('Asia/Tehran')
  }

  // Convert Prisma Date
  get(date: Date) {
    return dayjs(date.toISOString().replace('T', ' ').replace('.000Z', ''))
  }

  // Create date for prisma
  newDate(input?: string) {
    const localOffset = Math.abs(new Date().getTimezoneOffset()) // in minutes
    const localOffsetMillis = 60 * 1000 * localOffset
    return dayjs(input).add(localOffsetMillis, 'ms')
  }

  // dayjs(
  //   date?: dayjs.ConfigType,
  //   format?: dayjs.OptionType,
  //   locale?: string,
  //   strict?: boolean,
  // ) {
  //   return dayjs(date, format, locale, strict);
  // }

  // /**
  //  * Used to convert prisma date with timezone
  //  * @param input Date| string
  //  * @returns dayjs
  //  */
  // toDayjs(input: Date | string | number) {
  //   if (typeof input === 'number') {
  //     return dayjs(input * 1000);
  //   }

  //   if (input instanceof Date) {
  //     return dayjs(input).subtract(3, 'hours').subtract(30, 'minutes');
  //   }

  //   return dayjs(input);
  // }

  // /**
  //  * Create date that cares about timezone
  //  * @param input string
  //  * @returns Date
  //  */
  // newDate(input?: string) {
  //   const localOffset = Math.abs(new Date().getTimezoneOffset()); // in minutes
  //   const localOffsetMillis = 60 * 1000 * localOffset;
  //   return dayjs(input).add(localOffsetMillis, 'ms');
  // }
}
