import Diamond from '../src'
import { log, logs } from './logger'

abstract class A extends Diamond() {
	constructor() {
		super()
		this.log('construct A')
	}
	log(...args: any[]) {
		log(`[class=${this.constructor.name}]`, ...args)
	}
	fieldA = true
	func(x: number) {
		this.log('func A')
		return x
	}
	abstract absFunc(x: number): number
}
abstract class B extends Diamond(A) {
	constructor() {
		super()
		this.log('construct B')
	}
	fieldB = true
	func(x: number) {
		this.log('func B')
		return 1 + super.func(x)
	}
}
abstract class C extends Diamond(A) {
	constructor() {
		super()
		this.log('construct C')
	}
	// TODO: Here, if D extends diamond(B, C), then it's considered abstract - cf index.ts
	absFunc(x: number): number {
		return 42
	}
	fieldC = true
	func(x: number) {
		this.log('func C')
		return 2 + super.func(x)
	}
}
class D extends Diamond(C, B) {
	constructor() {
		super()
		this.log('construct D')
	}
	fieldD = true
	func(x: number) {
		this.log('func D')
		return 3 + super.func(x)
	}
}

beforeEach(() => {
	logs() //make sure logs are cleared
})

test('call orders', () => {
	const obj = new D()
	expect(logs()).toEqual([
		'[class=D] construct A',
		'[class=D] construct B',
		'[class=D] construct C',
		'[class=D] construct D'
	])
	expect([obj.fieldA, obj.fieldB, obj.fieldC, obj.fieldD]).toEqual([true, true, true, true])
	expect(obj.func(0)).toBe(6)
	expect(logs()).toEqual([
		'[class=D] func D',
		'[class=D] func C',
		'[class=D] func B',
		'[class=D] func A'
	])
})