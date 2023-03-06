class Di {
  private containerMap = new Map()

  get<T = unknown>(input: Constructable<T>): T {
    if (this.containerMap.has(input)) {
      return this.containerMap.get(input)
    }

    const newOne = new input()

    this.containerMap.set(input, newOne)

    return newOne
  }

  set<K>(k: Constructable<K>, v: any) {
    this.containerMap.set(k, v)
  }

  has<T = unknown>(input: Constructable<T>): boolean {
    return this.containerMap.has(input)
  }
}

const Container = new Di()

export default Container

export type Constructable<T> = new (...args: any[]) => T

export type AbstractConstructable<T> = NewableFunction & { prototype: T }

export type ServiceIdentifier<T = unknown> =
  | Constructable<T>
  | AbstractConstructable<T>
  | CallableFunction
  | string
