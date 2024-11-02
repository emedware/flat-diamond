import Diamond, { constructedObject, Seclude } from '../src'

interface Scenario {
	pubFld: number
	prvFld: number
	setPrvFld(v: number): void
	getPrvFld(): number
	setPubFld(v: number): void
	getPubFld(): number

	get accFld(): number
	set accFld(v: number)
}

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
	return t
}

test('leg-less', () => {
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
			return this.accFld
		}
		setPubFld(v: number) {
			this.pubFld = v
		}
		getPubFld() {
			return this.pubFld
		}

		get accFld() {
			return this.prvFld
		}
		set accFld(v: number) {
			this.prvFld = v
		}
	}
	const P = Seclude(X, ['prvFld'])
	class Y extends P {
		prvFld = 10
	}

	let t = testScenario(new Y(), P)
	expect(builtX).toBe(P.secluded(t))
})

test('leg-half', () => {
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

		get accFld() {
			return this.prvFld
		}
		set accFld(v: number) {
			this.prvFld = v
		}
	}
	const P = Seclude(X, ['prvFld'])
	class Y {
		prvFld = 10
	}
	class D extends Diamond(P, Y) {}
	class E extends Diamond(Y, P) {}

	let t = testScenario(new D(), P)
	expect(builtX).toBe(P.secluded(t))
	t = testScenario(new E(), P)
	expect(builtX).toBe(P.secluded(t))
})

test('leg-full', () => {
	// Note: the scenario is so unrealistic (if X is aware of Diamonds, it needs no seclusion) that no way to find the
	// 'secluded' object is provided - hence there is no test on that part here
	class X extends Diamond() {
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

		get accFld() {
			return this.prvFld
		}
		set accFld(v: number) {
			this.prvFld = v
		}
	}
	const P = Seclude(X, ['prvFld'])
	class Y {
		prvFld = 10
	}
	class D extends Diamond(P, Y) {}
	class E extends Diamond(Y, P) {}

	testScenario(new D(), P)
	testScenario(new E(), P)
})
