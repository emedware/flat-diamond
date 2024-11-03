import D from '../src'
import { log, logs } from './logger'

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

class Y extends D(X) {
	constructor(aValue: string) {
		super(aValue + ' and Y')
		log('Y:', aValue)
	}
}
let constructedObjectFromA: any = null
class A extends D() {
	constructor(aValue: string) {
		super(aValue + ' and A')
		constructedObjectFromA = this
		log('A:', aValue)
	}
}

class B extends D(End2, A) {
	constructor(aValue: string) {
		super(aValue + ' and B')
		log('B:', aValue)
		new Y('B...')
	}
}
class C extends D(B, End1, A) {
	constructor(aValue: string) {
		super(aValue + ' and C')
		log('C:', aValue)
	}
}

beforeAll(() => {
	logs() //make sure logs are cleared
})
test('construction', () => {
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
		'C: X'
	])
	expect(c).toBe(constructedObjectFromA)
})
