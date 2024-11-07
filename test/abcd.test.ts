import Diamond from '../src'
import { log, logs } from './logger'

let builtA: A | undefined

abstract class A {
	constructor(public arg: string) {
		this.log('construct A')
		builtA = this
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
	constructor(arg: string) {
		super(`${arg}B`)
		this.log('construct B')
	}
	absFunc(x: number): number {
		return 42
	}
	fieldB = true
	func(x: number) {
		this.log('func B')
		return 1 + super.func(x)
	}
}
abstract class C extends Diamond(A) {
	constructor(arg: string) {
		super(`${arg}C`)
		this.log('construct C')
	}
	fieldC = true
	func(x: number) {
		this.log('func C')
		return 2 + super.func(x)
	}
}
//@ts-expect-error Here, if D extends diamond(B, C), then it's not considered abstract - cf README.md#abstraction
class D extends Diamond(C, B) {
	constructor(arg: string) {
		super(`${arg}D`)
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
	const obj = new D('o')
	expect(builtA instanceof A).toBe(true)
	expect(builtA === obj).toBe(false)
	expect(logs()).toEqual([
		'[class=A] construct A',
		'[class=D] construct B',
		'[class=D] construct C',
		'[class=D] construct D',
	])
	expect([obj.fieldA, obj.fieldB, obj.fieldC, obj.fieldD]).toEqual([true, true, true, true])
	expect(obj.func(0)).toBe(6)
	expect(obj.arg).toBe('oDCB')
	expect(logs()).toEqual([
		'[class=D] func D',
		'[class=D] func C',
		'[class=D] func B',
		'[class=D] func A',
	])
	expect(builtA?.func(0)).toBe(6)
	expect(builtA?.arg).toBe('oDCB')
	expect(logs()).toEqual([
		'[class=D] func D',
		'[class=D] func C',
		'[class=D] func B',
		'[class=D] func A',
	])
})
