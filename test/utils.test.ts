import { overrideMethods } from '~/helpers'
import { log, logs } from './logger'

beforeEach(() => {
	logs()
})
test('overrideMethods', () => {
	class A {
		method() {
			log('A', 'method')
		}
		get value() {
			return 42
		}
	}
	class B extends A {
		method() {
			log('B', 'method')
			super.method()
		}
		get value() {
			return 5 + super.value
		}
	}
	const b = new B()
	b.method()
	expect(logs()).toEqual(['B method', 'A method'])
	expect(b.value).toBe(47)
	overrideMethods(B, (source) => ({
		method() {
			log('B', 'modified method')
			source.method()
		} /*
		get value() {
			return 15 + source.value
		}*/
	}))
})
