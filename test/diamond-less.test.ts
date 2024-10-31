import Diamond from '..'
import { log, logs } from './logger'

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

beforeAll(() => {
	logs() //make sure logs are cleared
})
test('diamond-less', () => {
	new F().method()
	expect(logs()).toEqual(['F', 'D', 'C', 'A'])
})
