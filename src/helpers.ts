import { Ctor } from './types'
import { fLegs, temporaryBuiltObjects } from './utils'

/**
 * As constructors build temporary objects, this function returns a reference to the real object being constructed.
 * In other cases, it just returns the object itself
 * @param obj `this` - the object being constructed by this constructor
 * @returns
 */
export function constructedObject<Class extends object>(obj: Class): Class {
	return (temporaryBuiltObjects.get(obj) as Class) || obj
}

/**
 * `instanceof` substitute for diamonds
 * @param obj Object to test
 * @param ctor Class to test
 * @returns If by a mean or another, `obj` is an instance of `ctor`
 */
export function instanceOf(obj: any, ctor: Ctor) {
	if (obj instanceof ctor) return true
	if (!obj || typeof obj !== 'object') return false

	for (const base of fLegs(obj.constructor) || [])
		if (base === ctor || base.prototype instanceof ctor) return true
	return false
}

type Method<Class extends Ctor, Args extends any[], Return> = (
	this: InstanceType<Class>,
	...args: Args
) => Return

/**
 *
 * @param target
 * @param factory
 * @deprecated Not deprecated but incomplete - just pushed away with other changes : *unreliable!*
 */
export function overrideMethods<Class extends Ctor, Args extends any[], Return>(
	target: Class,
	factory: (source: InstanceType<Class>) => Record<PropertyKey, Method<Class, Args, Return>>
) {
	Object.defineProperties(
		target.prototype,
		Object.getOwnPropertyDescriptors(factory(Object.getPrototypeOf(target.prototype)))
	)
}
