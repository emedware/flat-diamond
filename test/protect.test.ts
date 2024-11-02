import Diamond, { Seclude } from '../src'

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

function testScenario(t: Scenario, P: { privatePart(t: any): any }) {
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
	const pp = P.privatePart(t)
	expect(pp?.prvFld).toBe(5)
	expect(pp?.pubFld).toBe(4)
}

test('leg-less', () => {
	class X {
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

	testScenario(new Y(), P)
})

test('leg-half', () => {
	class X {
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

test('leg-full', () => {
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
