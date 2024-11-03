import { Ctor, KeySet } from './types'

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

/**
 * Get the next property descriptor of `name` in the lineage
 */
export function nextInLine(ctor: Ctor, name: PropertyKey) {
	let rv: PropertyDescriptor | undefined
	for (const uniLeg of linearLeg(ctor))
		if ((rv = Object.getOwnPropertyDescriptor(uniLeg.prototype, name)))
			return rv === secludedPropertyDescriptor ? undefined : rv
}

/**
 * Get the fLegs of the bottom class of this lineage
 */
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

export function secludedProxyHandler<TBase extends Ctor>(
	base: TBase | null,
	secludedProperties: KeySet
) {
	return {
		get(target, p, receiver) {
			if (base && p in base.prototype) {
				const pd = nextInLine(base, p)
				return pd && (pd.value || pd.get!.call(receiver))
			}
			return p in secludedProperties ? undefined : Reflect.get(target, p, receiver)
		},
		set(target, p, value, receiver) {
			if (p in secludedProperties)
				Object.defineProperty(receiver, p, {
					value,
					writable: true,
					enumerable: true,
					configurable: true
				})
			else return Reflect.set(target, p, value, target)
			return true
		},
		getPrototypeOf: (target) => target
	} as ProxyHandler<Ctor>
}
export const emptySecludedProxyHandler = secludedProxyHandler(null, {})
