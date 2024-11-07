import Diamond from '../src'
import { log, logs } from './logger'

beforeAll(() => {
	logs() //make sure logs are cleared
})
test('construction', () => {
	class End1 {
		constructor(aValue: string) {
			log('End1:', aValue)
		}
	}
	class End2 {
		constructor(aValue: string) {
			log('End2:', aValue)
			// A global value is used: test lack of interference
			new Y('End2...')
		}
	}

	class X {
		constructor(aValue: string) {
			log('X:', aValue)
		}
	}

	class Y extends Diamond(X) {
		constructor(aValue: string) {
			super(`${aValue} and Y`)
			log('Y:', aValue)
		}
	}
	let constructedObjectFromA: any = null
	class A extends Diamond() {
		constructor(aValue: string) {
			super(`${aValue} and A`)
			constructedObjectFromA = this
			log('A:', aValue)
		}
	}

	class B extends Diamond(End2, A) {
		constructor(aValue: string) {
			super(`${aValue} and B`)
			log('B:', aValue)
			new Y('B...')
		}
	}
	class C extends Diamond(B, End1, A) {
		constructor(aValue: string) {
			super(`${aValue} and C`)
			log('C:', aValue)
		}
	}
	const c = new C('X')
	expect(logs()).toEqual([
		'End1: X and C and B and A',
		'A: X and C and B',
		'End2: X and C and B',
		'X: End2... and Y',
		'Y: End2...',
		'B: X and C',
		'X: B... and Y',
		'Y: B...',
		'C: X',
	])
	expect(c).toBe(constructedObjectFromA)
})

test('sub-diamond', () => {
	class X extends Diamond() {
		constructor() {
			const o = new Object()
			super()
		}
	}
	class Y {
		x1: X = new X()
		x2: any

		constructor() {
			this.x2 = new X()
		}
	}
	class A extends Diamond(Y) {
		y1: Y = new Y()
		y2: any
		constructor() {
			super()
			//this.x2 = new X()
			this.y2 = new Y()
		}
	}
	const a = new A()
	const distinct: any = {
		a: a,
		//aX1: a.x1,
		//aX2: a.x2,
		aY1X1: a.y1.x1,
		aY1X2: a.y1.x2,
		aY2X1: a.y2.x1,
		aY2X2: a.y2.x2,
	}
	const distinctMap = new Map<any, string>()
	for (const k in distinct) {
		expect(distinctMap.has(distinct[k]) && `${k}=${distinctMap.get(distinct[k])}`).toBe(false)
		distinctMap.set(distinct[k], k)
	}
})
