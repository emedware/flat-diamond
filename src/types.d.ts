/**
 * The type of the constructor of an object.
 */
type Ctor<Class = any> = abstract new (...params: any[]) => Class
type Newable<Class = any> = new (...args: any[]) => Class

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

type BuildingStrategy = Map<Ctor, Ctor[]>
type KeySet<Key extends PropertyKey = PropertyKey> = Record<Key, true>
type Protected<TBase extends Ctor, Keys extends (keyof InstanceType<TBase>)[]> = Newable<
	Omit<InstanceType<TBase>, Keys[number]>
> & {
	privatePart(obj: InstanceType<TBase>): InstanceType<TBase> | undefined
}
