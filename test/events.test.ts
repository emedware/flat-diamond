import Diamond, { Eventful, events } from '../src'
import { log, logs } from './logger'

@events({
	blah() {
		log('blah', 'A', this.value)
	},
})
class A extends Eventful {
	constructor(public value: number) {
		super()
	}
}

@events({
	blah() {
		log('blah', 'B', this.value)
	},
})
class B extends A {}

@events({
	blah() {
		log('blah', 'C', this.value)
	},
})
class C extends A {}

@events({
	blah() {
		log('blah', 'D', this.value)
	},
})
class D extends Diamond(B, C) {}

test('events', () => {
	const d = new D(1)
	d.on('blah', function () {
		log('blah', 'instance', this.value)
	})
	d.emit('blah')
	expect(logs()).toEqual(['blah A 1', 'blah C 1', 'blah B 1', 'blah D 1', 'blah instance 1'])
	B.prototype.on('blah', function () {
		this.value++
	})
	d.emit('blah')
	expect(logs()).toEqual(['blah A 1', 'blah C 1', 'blah B 1', 'blah D 2', 'blah instance 2'])
})
