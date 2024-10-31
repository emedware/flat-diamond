import Diamond from '..'
import { log, logs } from './logger'

beforeAll(() => {
	logs() //make sure logs are cleared
})
test('diamond-less', () => {
	class A extends Diamond() {
		method() {
			log('A')
		}
	}
	class B extends A {}
	class C extends Diamond(B) {
		method() {
			log('C')
			super.method()
		}
	}
	class D extends C {
		method() {
			log('D')
			super.method()
		}
	}
	class E extends D {}
	class F extends Diamond(E) {
		method() {
			log('F')
			super.method()
		}
	}
	new F().method()
	expect(logs()).toEqual(['F', 'D', 'C', 'A'])
})

test('d-l multiple', () => {
	class X1 {}
	class X2 {
		method() {
			return 10
		}
	}
	class D1 extends Diamond(X1, X2) {}
	class X3 {}
	class X4 {}
	class D2 extends Diamond(X1, X3, D1, X4, X2) {}

	const t = new D2()
	expect(t.method()).toBe(10)
})
