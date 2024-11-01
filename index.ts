/**
 * The type of the constructor of an object.
 */
type Ctor<Class = any> = abstract new (...params: any[]) => Class

// Here, much black magic is kept in comments for research purpose. The "OmitNonAbstract" type has not yet been found.
/**
 * Black magic.
 * type `U = X | Y | Z` => `I = X & Y & Z`
 */ /*
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never*/
/*
type NoNever<T> = Pick<
	T,
	{
		[K in keyof T]: T[K] extends never ? never : K
	}[keyof T]
>*/
/*
type Both<A, B> = {
	[K in keyof A]: K extends keyof B
		? A[K] extends B[K]
			? A[K]
			: B[K] extends A[K]
				? B[K]
				: never
		: A[K]
} & NoNever<{
	[K in keyof B]: K extends keyof A ? never : B[K]
}>*/

/**
 * Specifies that the object is an intersection of all of the bases
 * Version with all the properties being merged in a big " & " : types Result.x = A.x & B.x
 * The problem being, if A and B both define a property get/set, it will be mixed as a field and not as a getter/setter
 */
/*type HasBases<TBases extends Ctor[]> = TBases extends []
	? object
	: UnionToIntersection<InstanceType<TBases[number]>>*/

/**
 * Version with every prop defined once:
 * Versions where only the last definition is used for each property.
 * Problem being, if A and B extend an abstract C who has an abstract C.m, and B implements it,
 * Then, B & A will be considered as implementing it while A & B will be considered abstract
 */
type HasBases<TBases extends Ctor[]> = TBases extends []
	? object
	: TBases extends [infer TBase, ...infer TRest]
		? TBase extends Ctor
			? TRest extends Ctor[]
				? InstanceType<TBase> & Omit<HasBases<TRest>, keyof InstanceType<TBase>>
				: never
			: never
		: never
/**
 * Gives all the classes from the base up to just before Object
 * Note: In "uni-legacy", the parent of Diamond is Object
 * @param base The base class
 */
function* linearLeg(base: Ctor): IterableIterator<Ctor> {
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
function bottomLeg(ctor: Ctor) {
	let last: Ctor = null
	for (; ctor !== Object; ctor = Object.getPrototypeOf(ctor.prototype).constructor) {
		if (allFLegs.has(ctor)) return ctor
		last = ctor
	}
	return last
}
function fLegs(ctor: Ctor) {
	return allFLegs.get(bottomLeg(ctor))
}

class LegacyConsistencyError extends Error {
	constructor(
		public diamond: Ctor,
		public base: Ctor
	) {
		super()
	}
	name = 'LegacyConsistencyError'
}

/**
 * Returns the next property descriptor in the FLeg for a property
 * @param ctor The constructor whose FLeg is being searched
 * @param name The name of the property
 * @param diamond The calling diamond
 * @returns
 */
function nextInFLeg(ctor: Ctor, name: PropertyKey, diamond: Ctor) {
	const fLeg = fLegs(ctor)
	let ndx = bottomLeg(ctor) === diamond ? 0 : -1
	if (ndx < 0) {
		ndx = fLeg.findIndex((base) => bottomLeg(base) === diamond) + 1
		if (ndx <= 0) throw new LegacyConsistencyError(diamond, ctor)
	}
	// When you don't find one descendant who is "you" [`Diamond` = "my Diamond"], then you are the first ancestor
	// In this case, you should initiate the index to `-1` so that `++ndx` will begin at 0
	// (Had to be commented as this "two wrongs make a right" is quite unexpected, even at writing time)
	// Note: the case where `diamond` is neither the root, neither in the fLeg, is not taken into account
	// as this is `flat-diamond`-only dependant and should raise a test error
	let rv: PropertyDescriptor
	do
		for (const uniLeg of linearLeg(fLeg[ndx++]))
			if ((rv = Object.getOwnPropertyDescriptor(uniLeg.prototype, name))) break
	while (!rv && ndx < fLeg.length)
	return rv
}
const diamondHandler: ProxyHandler<Ctor> = {
	get(target, p, receiver) {
		if (p === Symbol.hasInstance) return () => false
		const pd = nextInFLeg(receiver.constructor, p, target)
		return pd && (pd.value || pd.get.call(receiver))
	},
	set(target, p, v, receiver) {
		const pd = nextInFLeg(receiver.constructor, p, target)
		if (!pd || pd.writable)
			Object.defineProperty(receiver, p, {
				value: v,
				writable: true,
				enumerable: true,
				configurable: true
			})
		else if (pd && pd.set) pd.set.call(receiver, v)
		else return false
		return true
	},
	getPrototypeOf(target) {
		return Object
	}
}

type BuildingStrategy = Map<Ctor, Ctor[]>
let buildingDiamond: {
	built: object
	strategy: BuildingStrategy
} | null = null
const temporaryBuiltObjects = new WeakMap<object, object>(),
	allFLegs = new WeakMap<Ctor, Ctor[]>()

export default function Diamond<TBases extends Ctor[]>(
	...baseClasses: TBases
): Ctor<HasBases<TBases>> {
	const bases: Ctor[] = []
	for (const base of baseClasses) {
		let fLeg = [base, ...(fLegs(base) || [])]
		let iBases = 0,
			iFLeg: number
		do {
			iFLeg = -1
			for (iBases = 0; iBases < bases.length; iBases++) {
				iFLeg = fLeg.indexOf(bases[iBases])
				if (iFLeg >= 0) break
			}
			if (iFLeg >= 0) {
				bases.splice(iBases, 0, ...fLeg.slice(0, iFLeg))
				iBases += iFLeg + 1
				fLeg = fLeg.slice(iFLeg + 1)
			}
		} while (iFLeg >= 0)
		bases.push(...fLeg)
	}
	const buildingStrategy = new Map<Ctor, Ctor[]>()
	const myResponsibility: Ctor[] = []
	class Diamond {
		constructor(...args: any[]) {
			const itsMe = !buildingDiamond,
				responsibility = itsMe
					? myResponsibility
					: buildingDiamond.strategy.get(this.constructor as Ctor)
			if (itsMe)
				buildingDiamond = {
					built: this,
					strategy: buildingStrategy
				} // It will be set to `null` on purpose in the process and needs to be restored
			const locallyStoredDiamond = buildingDiamond
			try {
				for (const subs of responsibility) {
					// Builds the temporary object and import all its properties
					const temp = new (subs as any)(...args) // `any` because declared as an abstract class
					Object.defineProperties(
						locallyStoredDiamond.built,
						Object.getOwnPropertyDescriptors(temp)
					)
				}
			} finally {
				if (!itsMe) {
					// Feels the same
					Object.setPrototypeOf(this, Object.getPrototypeOf(locallyStoredDiamond.built))
					Object.defineProperties(
						this,
						Object.getOwnPropertyDescriptors(locallyStoredDiamond.built)
					)
					// Is the same (through `constructedObject`)
					temporaryBuiltObjects.set(this, locallyStoredDiamond.built)
				}
				buildingDiamond = null
			}
		}
		static [Symbol.hasInstance](obj: any) {
			if (!obj || typeof obj !== 'object') return false
			const objBottom = bottomLeg(obj.constructor)
			if (objBottom === Diamond) return true
			const fLeg = allFLegs.get(objBottom)
			return fLeg && fLeg.some((base) => bottomLeg(base) === Diamond)
		}
	}
	allFLegs.set(Diamond, bases)
	/**
	 * Constructs the building strategy for building this class and only this class with its specific legacy
	 */
	let nextResponsibility = myResponsibility
	for (const base of bases) {
		nextResponsibility.unshift(base)
		if (fLegs(base)) buildingStrategy.set(base, (nextResponsibility = []))
	}

	Object.setPrototypeOf(Diamond.prototype, new Proxy(Diamond, diamondHandler))

	return <new (...args: any[]) => HasBases<TBases>>(<unknown>Diamond)
}

/**
 * As constructors build temporary objects, this function returns a reference to the real object being constructed.
 * In other cases, it just returns the object itself
 * @param obj `this` - the object being constructed by this constructor
 * @returns
 */
export function constructedObject(obj: object) {
	return temporaryBuiltObjects.get(obj) || obj
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

/* Idée pour plus tard:
B.property.method = classMethod(B, (source)=> function(this: B, ...) { ... })
*/
