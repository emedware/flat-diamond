/**
 * Gives all the classes from the base up to just before Object
 * Note: In "uni-legacy", the parent of Diamond is Object
 * @param base The base class
 */
export function* linearLeg(base: Ctor): IterableIterator<Ctor> {
	yield base
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
		if ((rv = Object.getOwnPropertyDescriptor(uniLeg.prototype, name))) return rv
}

export function fLegs(ctor: Ctor) {
	return allFLegs.get(bottomLeg(ctor))
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

export const temporaryBuiltObjects = new WeakMap<object, object>(),
	allFLegs = new WeakMap<Ctor, Ctor[]>()
