import Diamond, { Protect } from '../src'

test('leg-less', () => {
	class X {
		pubFld = 0
		prvFld = 0
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
	const P = Protect(X, ['prvFld'])
	class Y extends P {
		prvFld = 0
	}

	const t = new Y()
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
})

test('leg-full', () => {
	class X {
		pubFld = 0
		prvFld = 0
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
	const P = Protect(X, ['prvFld'])
	class Y {
		prvFld = 0
	}
	class D extends Diamond(P, Y) {}

	const t = new D()
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
})
