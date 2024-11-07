import Diamond, { Seclude } from '../src'

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
