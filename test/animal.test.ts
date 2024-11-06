import Diamond from '../src'
import { log, logs } from './logger'

class Animal extends Diamond() {
	get actions(): string[] {
		return ['eat', 'sleep']
	}
	doIt() {
		log('mniom')
	}
}

class FlyingAnimal extends Diamond(Animal) {
	get actions(): string[] {
		return [...super.actions, 'fly']
	}
	doIt() {
		log('woosh')
		super.doIt()
	}
}

class SwimmingAnimal extends Diamond(Animal) {
	get actions(): string[] {
		return [...super.actions, 'swim']
	}

	doIt() {
		log('fshhh')
		super.doIt()
	}
}

class WalkingAnimal extends Diamond(Animal) {
	get actions(): string[] {
		return [...super.actions, 'walk']
	}

	doIt() {
		log('picpoc')
		super.doIt()
	}
}

class Duck extends Diamond(FlyingAnimal, SwimmingAnimal, WalkingAnimal) {
	doIt() {
		log('KWAK')
		super.doIt()
	}
	get actions(): string[] {
		return [...super.actions, 'quack']
	}
}

beforeEach(() => {
	logs() //make sure logs are cleared
})
test('inheritance', () => {
	const duck = new Duck()
	expect(duck.actions).toEqual(['eat', 'sleep', 'walk', 'swim', 'fly', 'quack'])
	duck.doIt()
	expect(logs()).toEqual(['KWAK', 'woosh', 'fshhh', 'picpoc', 'mniom'])

	const beaver = new (Diamond(WalkingAnimal, SwimmingAnimal))()
	expect(beaver.actions).toEqual(['eat', 'sleep', 'swim', 'walk'])
	beaver.doIt()
	expect(logs()).toEqual(['picpoc', 'fshhh', 'mniom'])
})
