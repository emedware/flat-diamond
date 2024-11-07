import type { Ctor } from 'lib'
import Diamond, { Seclude } from '../src'
import { log, logs } from './logger'

test('toStringTags', () => {
	class X {}
	const S = Seclude(X)
	const s = new S()
	expect(s.toString()).toBe('[object Secluded<X>]')
	const D = Diamond(X)
	const d = new D()
	expect(d.toString()).toBe('[object Diamond<X>]')
})

describe('before super', () => {
	test('working', () => {
		class A extends Diamond() {}
		const X = Diamond(A)
		class B extends Diamond() {
			a: InstanceType<typeof X>
			constructor() {
				const a = new X()
				super()
				this.a = a
			}
		}
		class C extends Diamond(B) {}
		const c = new C()
		expect(c.a).toBeInstanceOf(A)
		expect(c.a === c).toBe(false)
	})
	test('failing', () => {
		class A extends Diamond() {}
		const X = Diamond(A)
		class B extends X {
			a: InstanceType<typeof X>
			constructor() {
				const a = new X()
				super()
				this.a = a
			}
		}
		class C extends Diamond(B) {}
		expect(() => new C()).toThrow()
	})
})

describe('unplanned access', () => {
	test.each([
		['diamond', class X extends Diamond() {}],
		['simple', class X {}],
	])('undeclared on %s', (_: string, X: Ctor) => {
		const S = Seclude(X as any, ['undeclared']) as any
		const s = new S()
		expect(s.undeclared).toBeUndefined()
		expect(s.undeclaredPublic).toBeUndefined()
		expect(S(s).undeclared).toBeUndefined()
		s.undeclared = 1
		s.undeclaredPublic = 3
		S(s).undeclared = 2
		expect(s.undeclared).toBe(1)
		expect(s.undeclaredPublic).toBe(3)
		expect(S(s).undeclared).toBe(2)
		expect(S(s).undeclaredPublic).toBe(3)
	})
	test('X-only', () => {
		class WriteOnly {
			set value(v: number) {
				log('set', v)
			}
		}
		class ReadOnly {
			get value() {
				return 0
			}
		}
		let x: any
		logs()
		x = new (Seclude(WriteOnly))()
		expect(x.value).toBeUndefined()
		x.value = 5
		expect(logs()).toEqual(['set 5'])
		x = new (Seclude(ReadOnly))()
		expect(x.value).toBe(0)
		expect(() => {
			x.value = 5
		}).toThrow()
		logs()
		x = new (Diamond(WriteOnly))()
		expect(x.value).toBeUndefined()
		x.value = 5
		expect(logs()).toEqual(['set 5'])
		x = new (Diamond(ReadOnly))()
		expect(x.value).toBe(0)
		expect(() => {
			x.value = 5
		}).toThrow()
	})
})
