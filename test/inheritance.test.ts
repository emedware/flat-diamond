import D from '..'
import { log, logs } from './logger'

abstract class Parent {
	constructor() {
		log('parent', 'constructor')
	}
	method(): void {}
	set value(x: number) {}
	get value(): number {
		return 42
	}
}

class X {
	constructor() {
		log('x', 'constructor')
	}
}

class Dad extends D(Parent, X) {
	constructor() {
		super()
		log('dad', 'constructor')
	}
	method() {
		log('dad', 'method')
		super.method()
	}
	set value(x: number) {
		log('dad', 'setter')
		super.value = x
	}
	get value() {
		log('dad', 'getter')
		return super.value
	}
}
class Mum extends D(Parent) {
	constructor() {
		super()
		log('mum', 'constructor')
	}
	method() {
		log('mum', 'method')
		super.method()
	}
	set value(x: number) {
		log('mum', 'setter')
		super.value = x
	}
	get value() {
		log('mum', 'getter')
		return super.value
	}
}

class Child extends D(Dad, Mum) {
	constructor() {
		super()
		log('child', 'constructor')
	}
	method() {
		log('child', 'method')
		super.method()
	}
	set value(x: number) {
		log('child', 'setter')
		super.value = x
	}
	get value() {
		log('child', 'getter')
		return super.value
	}
}
/*
test('constructors', () => {
	logs()
	const child = new Child()
	expect(logs()).toEqual([
		'x constructor',
		'parent constructor',
		'mum constructor',
		'dad constructor',
		'child constructor'
	])
})
test('methods', () => {
	const child = new Child()
	logs()
	child.method()
	expect(logs()).toEqual(['child method', 'dad method', 'mum method'])
})
test('setters', () => {
	const child = new Child()
	logs()
	child.value = 42
	expect(logs()).toEqual(['child setter', 'dad setter', 'mum setter'])
})*/
test('getters', () => {
	const child = new Child()
	logs()
	expect(child.value).toBe(42)
	expect(logs()).toEqual(['child getter', 'dad getter', 'mum getter'])
})
