/**
 * The type of the constructor of an object.
 */
type Ctor<Class = any> = (abstract new (...params: any[]) => Class) & {
	fLeg?: Ctor[]
}
/**
 * Black magic.
 * type `U = X | Y | Z` => `I = X & Y & Z`
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never

type NoNever<T> = Pick<
	T,
	{
		[K in keyof T]: T[K] extends never ? never : K
	}[keyof T]
>
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
}>

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
				? //Both<InstanceType<TBase>, HasBases<TRest>>
					InstanceType<TBase> & Omit<HasBases<TRest>, keyof InstanceType<TBase>>
				: never
			: never
		: never

/**
 * Extracts the FLatLEGacy of a class
 * @param base
 * @returns
 */
function extractFLeg(base: Ctor) {
	// diamond(A, B) returns [A, B] but `class C extends diamond(A, B)` returns [C, A, B]
	if (base.fLeg) return [base, ...base.fLeg]
	for (let ctor = base; ctor !== Object; ctor = Object.getPrototypeOf(ctor.prototype).constructor)
		if (ctor.fLeg) return [base, ...ctor.fLeg]
	return [base]
}

/**
 * Finds the first common element between two arrays
 * @param arr1
 * @param arr2
 * @returns [index1, index2] so that arr1[index1] === arr2[index2]
 */
function firstCommon<T>(arr1: T[], arr2: T[]) {
	for (const i1 in arr1) {
		const i2 = arr2.indexOf(arr1[i1])
		if (i2 !== -1) return [Number(i1), i2]
	}
}

type BuildingStrategy = Map<Ctor, Ctor[]>
let buildingDiamond: {
	built: object
	strategy: BuildingStrategy
} | null = null

export default function Diamond<TBases extends Ctor[]>(
	...baseClasses: TBases
): Ctor<HasBases<TBases>> {
	const bases: Ctor[] = []
	for (const base of baseClasses) {
		/**
		 * [ X, A ] with :
		 * X - Y \
		 *        I - J
		 * A - B /
		 * becomes:
		 * X - Y - A - B - I - J
		 */
		const fLeg = extractFLeg(base),
			intersection = firstCommon(bases, fLeg)
		if (!intersection) bases.push(...fLeg)
		else bases.splice(intersection[0], 0, ...fLeg.slice(0, intersection[1]))
	}
	function nextInFLeg(ctor: any, name: string) {
		let ndx = /*Object.getPrototypeOf(ctor.prototype) === Diamond.prototype
				? -1
				: */ ctor.fLeg.findIndex((base) => Object.getPrototypeOf(base.prototype).constructor === Diamond)
		// When you don't find one descendant who is "you" [`Diamond` = "my Diamond"], then you are the first ancestor
		// In this case, you should initiate the index to `-1` so that `++ndx` will begin at 0
		// (Had to be commented as this "two wrongs make a good" is quite unexpected, even at writing time)
		let rv: PropertyDescriptor
		do rv = Object.getOwnPropertyDescriptor(ctor.fLeg[++ndx].prototype, name)
		while (!rv && ndx < ctor.fLeg.length)
		return rv
	}
	const buildingStrategy = new Map<Ctor, Ctor[]>()
	const myResponsibility: Ctor[] = []
	class Diamond {
		static fLeg = bases
		constructor(...args: any[]) {
			try {
				const responsibility = buildingDiamond
					? buildingDiamond.strategy.get(this.constructor as Ctor)
					: myResponsibility
				if (!buildingDiamond)
					buildingDiamond = {
						built: Object.create(this.constructor.prototype),
						strategy: buildingStrategy
					} // It will be set to `null` on purpose in the process and needs to be restored
				const locallyStoredDiamond = buildingDiamond
				for (const [ndx, subs] of responsibility.entries()) {
					// `any` because declared as an abstract class
					const temp = new (subs as any)(...args)
					Object.defineProperties(
						locallyStoredDiamond.built,
						Object.getOwnPropertyDescriptors(temp)
					)
				}
				Object.setPrototypeOf(this, Object.getPrototypeOf(locallyStoredDiamond.built))
				Object.defineProperties(this, Object.getOwnPropertyDescriptors(locallyStoredDiamond.built))
			} finally {
				buildingDiamond = null
			}
		}
	}
	/**
	 * Constructs the building strategy for building this class and only this class with its specific legacy
	 */
	let nextResponsibility = myResponsibility
	for (const base of bases) {
		let endTSLegacy = Object.getPrototypeOf(base.prototype).constructor
		while (!endTSLegacy.fLeg && endTSLegacy !== Object)
			endTSLegacy = Object.getPrototypeOf(endTSLegacy.prototype).constructor
		nextResponsibility.unshift(base)
		if (endTSLegacy.fLeg) buildingStrategy.set(base, (nextResponsibility = []))
	}
	/**
	 * Fills the diamond with all the properties of the bases
	 */
	const fLegged = new Set<string>()
	for (const base of bases)
		Object.getOwnPropertyNames(base.prototype).forEach((name) => fLegged.add(name))

	for (const name of fLegged)
		if (name !== 'constructor') {
			Object.defineProperty(Diamond.prototype, name, {
				get() {
					const pd = nextInFLeg(this.constructor, name)
					return pd && (pd.value || pd.get.call(this))
				},
				set(v: any) {
					const pd = nextInFLeg(this.constructor, name)
					if (!pd || pd.writable) this[name] = v
					if (pd && pd.set) pd.set.call(this, v)
				}
			})
		}

	return <new (...args: any[]) => HasBases<TBases>>(<unknown>Diamond)
}

/* Idée pour plus tard:
B.property.method = classMethod(B, (source)=> function(this: B, ...) { ... })
*/
// TODO: instanceof