import { Ctor } from './types'

/**
 * Gives all the classes from the base up to just before Object
 * Note: In "uni-legacy", the parent of Diamond is Object
 * @param base The base class
 */
export function* linearLeg(base: Ctor): IterableIterator<Ctor> {
	for (
		let ctor = base;
		ctor !== Object && !allFLegs.has(ctor);
		ctor = Object.getPrototypeOf(ctor.prototype).constructor
	)
		yield ctor
}

/**
 * Gets the bottom (uni-)legacy of a class just before Object (like Diamond)
 */
export function bottomLeg(ctor: Ctor) {
	let last: Ctor = Object
	for (; ctor !== Object; ctor = Object.getPrototypeOf(ctor.prototype).constructor) {
		if (allFLegs.has(ctor)) return ctor
		last = ctor
	}
	return last
}

export function nextInLine(ctor: Ctor, name: PropertyKey) {
	let rv: PropertyDescriptor | undefined
	for (const uniLeg of linearLeg(ctor))
		if ((rv = Object.getOwnPropertyDescriptor(uniLeg.prototype, name)))
			return rv === secludedPropertyDescriptor ? undefined : rv
}

export function fLegs(ctor: Ctor) {
	return allFLegs.get(bottomLeg(ctor))
}

// Communication unique constant for `seclude` to communicate with `diamond`
export const secludedPropertyDescriptor: PropertyDescriptor = {
	value: undefined,
	configurable: true
}

/**
 * Returns the next property descriptor in the FLeg for a property
 * @param ctor The constructor whose FLeg is being searched
 * @param name The name of the property
 * @param diamond The calling diamond
 * @returns
 */
export function nextInFLeg(ctor: Ctor, name: PropertyKey, diamond: Ctor) {
	const fLeg = fLegs(ctor)
	if (!fLeg) throw new Error('Inconsistent diamond hierarchy')
	let ndx = bottomLeg(ctor) === diamond ? 0 : -1
	if (ndx < 0) {
		ndx = fLeg.findIndex((base) => bottomLeg(base) === diamond) + 1
		if (ndx <= 0) throw new Error('Inconsistent diamond hierarchy')
	}
	let rv: PropertyDescriptor | undefined
	do rv = nextInLine(fLeg[ndx++], name)
	while (!rv && ndx < fLeg.length)
	return rv
}

export const allFLegs = new WeakMap<Ctor, Ctor[]>()

// Deflect all actions so they they apply to `target` instead of `receiver`
export const forwardProxyHandler: ProxyHandler<Ctor> = {
	get(target, p) {
		return Reflect.get(target, p)
	},
	set(target, p, v) {
		return Reflect.set(target, p, v)
	},
	getOwnPropertyDescriptor(target, p) {
		return Reflect.getOwnPropertyDescriptor(target, p)
	},
	getPrototypeOf(target) {
		return Reflect.getPrototypeOf(target)
	},
	ownKeys(target) {
		return Reflect.ownKeys(target)
	},
	has(target, p) {
		return Reflect.has(target, p)
	},
	isExtensible(target) {
		return Reflect.isExtensible(target)
	},
	preventExtensions(target) {
		return Reflect.preventExtensions(target)
	},
	defineProperty(target, p, attributes) {
		return Reflect.defineProperty(target, p, attributes)
	},
	deleteProperty(target, p) {
		return Reflect.deleteProperty(target, p)
	}
}
