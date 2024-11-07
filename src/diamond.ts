import { Ctor, HasBases, Newable } from './types'
import {
	allFLegs,
	emptySecludedProxyHandler,
	fLegs,
	hasInstanceManager,
	hasInstanceManagers,
	linearLeg,
	manageHasInstance,
	nextInFLeg
} from './utils'

type BuildingStrategy = Map<Ctor, Ctor[]>
let buildingDiamond: {
	built: object
	// TODO: Not a map, should be a stack where each elements are popped one by one, we know the order
	// It could allow 'Inconsistent diamond hierarchy' to become a warning?
	// (the error would be checked when exiting the stack)
	strategy: BuildingStrategy
} | null = null

const diamondHandler: {
	getPrototypeOf(target: Ctor): Ctor
	get(target: Ctor, p: PropertyKey, receiver: Ctor): any
	set(target: Ctor, p: PropertyKey, v: any, receiver: Ctor): boolean
} & ProxyHandler<Ctor> = {
	get(target, p, receiver) {
		if (p === 'constructor') return Object
		const pd = nextInFLeg(receiver.constructor, p, target)
		return pd && ('value' in pd ? pd.value : 'get' in pd ? pd.get!.call(receiver) : undefined)
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

/**
 * When secluding a class whose linear legacy ends on a diamond, this is used not to seclude further than the diamond
 */
export let lastDiamondProperties: PropertyDescriptorMap | null

export default function Diamond<TBases extends Ctor[]>(
	...baseClasses: TBases
): Newable<HasBases<TBases>> {
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
			lastDiamondProperties = null
			const responsibility = buildingDiamond
				? buildingDiamond!.strategy.get(this.constructor as Ctor)!
				: myResponsibility
			if (!responsibility) {
				throw new Error(`Inconsistent diamond hierarchy.
This might happen if a diamond is created from another constructor before its 'super(...)' is called.`)
			}
			if (!buildingDiamond)
				buildingDiamond = {
					built: this,
					strategy: buildingStrategy
				} // It will be set to `null` on purpose in the process and needs to be restored
			const locallyStoredDiamond = buildingDiamond!
			try {
				// `super()`: Builds the temporary objects and import all their properties
				for (const subs of responsibility) {
					buildingDiamond = fLegs(subs) ? locallyStoredDiamond : null
					//@ts-expect-error subs is declared as abstract
					const temp = new subs(...args)
					// Even if `Diamond` managed: property initializers do not go through proxy
					if (locallyStoredDiamond.built !== temp) {
						// import properties from temp object
						Object.defineProperties(
							locallyStoredDiamond.built,
							Object.getOwnPropertyDescriptors(temp)
						)
						// Empty the object and make it react as if it was the diamond.
						// Useless in most cases, but if that object was given out as a reference, it can still
						// be interacted with
						for (const p of Object.getOwnPropertyNames(temp)) delete temp[p]
						// TODO: test this fake "head"
						Object.setPrototypeOf(
							temp,
							new Proxy(locallyStoredDiamond.built, emptySecludedProxyHandler)
						)
					}
				}
			} finally {
				//In the constructor method and in the field initializers, we can build diamonds, but not *this* diamond
				buildingDiamond = null
			}
			lastDiamondProperties = Object.getOwnPropertyDescriptors(locallyStoredDiamond.built)
			// Value used by `this` on `super(...)` return
			return locallyStoredDiamond.built
		}
		static [Symbol.hasInstance] = hasInstanceManager(Diamond)
	}
	hasInstanceManagers.add(Diamond)
	allFLegs.set(Diamond, bases)
	for (const base of baseClasses)
		if (!fLegs(base)) for (const ctor of linearLeg(base)) if (!manageHasInstance(ctor)) break
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
