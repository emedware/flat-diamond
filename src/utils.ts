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
 * @returns The property found
 * @throws {Error} If `diamond` is not in the fLeg of `ctor`
 */
export function nextInFLeg(
	ctor: Ctor,
	name: PropertyKey,
	diamond: Ctor
): PropertyDescriptor | undefined {
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
			// `p in base.prototype` => access secluded instance method
			if (base && p in base.prototype) {
				const pd = nextInLine(base, p)
				return pd && (pd.value || pd.get!.call(receiver))
			}
			return p in secludedProperties ? undefined : Reflect.get(target, p, target)
		},
		set(target, p, value, receiver) {
			if (p in secludedProperties) {
				Object.defineProperty(receiver, p, {
					value,
					writable: true,
					enumerable: true,
					configurable: true
				})
				return true
			}
			return Reflect.set(target, p, value, target)
		},
		getPrototypeOf: (target) => target
	} as ProxyHandler<Ctor>
}
export const emptySecludedProxyHandler = secludedProxyHandler(null, Object.create(null))

export function hasInstanceManager<Class extends Ctor>(
	cls: Class,
	original?: (obj: any) => boolean
) {
	function nativeLinear(ctor: Ctor) {
		// linearLeg ignore last diamond (that we need)
		for (; ctor !== Object; ctor = Object.getPrototypeOf(ctor.prototype).constructor)
			if (ctor === cls) return true
		return false
	}
	const inheritsFrom = original
		? (ctor: Ctor) => nativeLinear(ctor) || original(ctor.prototype)
		: (ctor: Ctor) => nativeLinear(ctor)
	return (obj: any) => {
		if (!obj || typeof obj !== 'object') return false
		if (inheritsFrom(obj.constructor)) return true
		const fLeg = fLegs(obj.constructor)
		if (fLeg && fLeg.some(inheritsFrom)) return true
		const protoObj = Object.getPrototypeOf(obj)
		return obj.constructor.prototype !== protoObj && protoObj instanceof cls
	}
}
export const hasInstanceManagers = new WeakSet<Ctor>()
export function manageHasInstance(ctor: Ctor) {
	if (hasInstanceManagers.has(ctor)) return false
	hasInstanceManagers.add(ctor)
	Object.defineProperty(ctor, Symbol.hasInstance, {
		value: hasInstanceManager(
			ctor,
			ctor.hasOwnProperty(Symbol.hasInstance) ? ctor[Symbol.hasInstance] : undefined
		),
		configurable: true
	})
	return true
}
