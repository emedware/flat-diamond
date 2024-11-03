import Diamond, { Seclude } from '../src'

interface Scenario {
	pubFld: number
	prvFld: number
	setPrvFld(v: number): void
	getPrvFld(): number
	setPubFld(v: number): void
	getPubFld(): number
	methodA(): string
	get accFld(): number
	set accFld(v: number)
}

let builtX: X | null = null
class X {
	constructor() {
		builtX = this
	}
	pubFld = 0
	prvFld = 8
	setPrvFld(v: number) {
		this.prvFld = v
	}
	getPrvFld() {
		return this.prvFld
	}
	setPubFld(v: number) {
		this.pubFld = v
	}
	getPubFld() {
		return this.pubFld
	}
	methodA() {
		return 'Xa' + this.methodB()
	}
	methodB() {
		return 'Xb'
	}
	get accFld() {
		return this.prvFld
	}
	set accFld(v: number) {
		this.prvFld = v
	}
}
const P = Seclude(X, ['prvFld', 'methodB'])

function testScenario(t: Scenario, P: { secluded(t: any): any }) {
	expect(t.pubFld).toBe(0)
	expect(t.accFld).toBe(8)
	expect(t.prvFld).toBe(10)
	t.pubFld = 1
	expect(t.getPubFld()).toBe(1)
	t.prvFld = 2
	t.accFld = 3
	expect(t.prvFld).toBe(2)
	expect(t.getPrvFld()).toBe(3)
	t.setPubFld(4)
	expect(t.pubFld).toBe(4)
	t.setPrvFld(5)
	expect(t.accFld).toBe(5)
	expect(t.prvFld).toBe(2)
	const pp = P.secluded(t)
	expect(pp?.prvFld).toBe(5)
	expect(pp?.pubFld).toBe(4)
	//methods
	expect(t.methodA()).toBe('yXaXb')
	expect(() => (t as any).methodB()).toThrow()
	return t
}

beforeAll(() => {
	builtX = null
})
test('leg-less', () => {
	class Y extends P {
		prvFld = 10
		//@ts-ignore https://github.com/microsoft/TypeScript/issues/27689
		methodA() {
			return 'y' + super.methodA()
		}
	}

	let t = testScenario(new Y(), P)
	expect(t instanceof X).toBe(true)
	expect(builtX! instanceof X).toBe(true)
	expect(builtX).toBe(P.secluded(t))

	// This is no code to run but to type-check
	function tsTest() {
		let p = new P()
		p.pubFld++
		//@ts-expect-error
		P.prvFld++
	}
})

test('leg-half', () => {
	class Y {
		prvFld = 10
	}
	class D extends Diamond(P, Y) {
		//@ts-ignore https://github.com/microsoft/TypeScript/issues/27689
		methodA() {
			return 'y' + super.methodA()
		}
	}
	class E extends Diamond(Y, P) {
		//@ts-ignore https://github.com/microsoft/TypeScript/issues/27689
		methodA() {
			return 'y' + super.methodA()
		}
	}

	let t = testScenario(new D(), P)
	expect(t instanceof X).toBe(true)
	expect(builtX! instanceof X).toBe(true)
	expect(builtX).toBe(P.secluded(t))
	t = testScenario(new E(), P)
	expect(t instanceof X).toBe(true)
	expect(builtX! instanceof X).toBe(true)
	expect(builtX).toBe(P.secluded(t))
})

test('leg-full', () => {
	// Note: the scenario can perhaps happen when a library extends a class that it receives as a parameter
	// Anyway, it's good to stretch the edge-cases browsing
	class XD extends Diamond() {
		pubFld = 0
		prvFld = 8
		setPrvFld(v: number) {
			this.prvFld = v
		}
		getPrvFld() {
			return this.prvFld
		}
		setPubFld(v: number) {
			this.pubFld = v
		}
		getPubFld() {
			return this.pubFld
		}
		methodA() {
			return 'Xa' + this.methodB()
		}
		methodB() {
			return 'Xb'
		}
		get accFld() {
			return this.prvFld
		}
		set accFld(v: number) {
			this.prvFld = v
		}
	}
	const P = Seclude(X, ['prvFld', 'methodB'])
	class Y {
		prvFld = 10
	}
	class D extends Diamond(P, Y) {
		//@ts-ignore https://github.com/microsoft/TypeScript/issues/27689
		methodA() {
			return 'y' + super.methodA()
		}
	}
	class E extends Diamond(Y, P) {
		//@ts-ignore https://github.com/microsoft/TypeScript/issues/27689
		methodA() {
			return 'y' + super.methodA()
		}
	}

	testScenario(new D(), P)
	testScenario(new E(), P)
})
