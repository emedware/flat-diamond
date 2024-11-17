import type { Ctor, HasBases, Newable } from './types'
import {
	LateSuperError,
	allFLegs,
	bottomLeg,
	emptySecludedProxyHandler,
	fLegs,
	hasInstanceManager,
	hasInstanceManagers,
	linearLeg,
	manageHasInstance,
	nextInFLeg,
} from './utils'

type BuildingStrategy = {
	target: Ctor
	subs: Ctor[]
}[]
let buildingDiamond: {
	built: object
	strategy: BuildingStrategy
} | null = null

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
		let iBases = 0
		let iFLeg: number
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
	const buildingStrategy: BuildingStrategy = []
	const myResponsibility: Ctor[] = []
	// TODO: Diamond becomes a function to remove the prototype's prototype who is a proxy
	class Diamond {
		constructor(...args: any[]) {
			lastDiamondProperties = null
			const { responsibility, bdRestore } = !buildingDiamond
				? {
						responsibility: myResponsibility,
					}
				: buildingDiamond.strategy[0].target === Diamond
					? {
							responsibility: buildingDiamond.strategy.shift()!.subs,
						}
					: {
							bdRestore: buildingDiamond,
							responsibility: myResponsibility,
						}
			if (!buildingDiamond || bdRestore)
				buildingDiamond = {
					built: this,
					strategy: [...buildingStrategy],
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
						if (fLegs(subs))
							/* istanbul ignore next: internal bug guard */
							throw new LateSuperError(`Inconsistent diamond hierarchy under [Diamond<${baseClasses.map((b) => b.name).join(',')}>], for ${this.constructor.name},
This happens if a diamond creates another instance of the same diamond in the constructor before calling \`super(...)\`.`)
						// import properties from temp object
						Object.defineProperties(
							locallyStoredDiamond.built,
							Object.getOwnPropertyDescriptors(temp)
						)
						// Empty the object and make it react as if it was the diamond.
						// Useless in most cases, but if that object was given out as a reference, it can still
						// be interacted with
						for (const p of Object.getOwnPropertyNames(temp)) delete temp[p]
						Object.setPrototypeOf(
							temp,
							new Proxy(locallyStoredDiamond.built, emptySecludedProxyHandler)
						)
					}
				}
			} finally {
				//In the constructor method and in the field initializers, we can build diamonds, but not *this* diamond
				buildingDiamond = bdRestore ?? null
			}
			lastDiamondProperties = Object.getOwnPropertyDescriptors(locallyStoredDiamond.built)
			if (
				locallyStoredDiamond.built !== this &&
				Object.getOwnPropertyNames(this).length + Object.getOwnPropertySymbols(this).length > 0
			)
				/* istanbul ignore next: internal bug guard */
				throw new Error('Temporary object must not have own properties or symbols')

			// biome-ignore lint/correctness/noConstructorReturn: This is the whole purpose of this library
			return locallyStoredDiamond.built
		}
		static [Symbol.hasInstance] = hasInstanceManager(Diamond)
	}
	Object.defineProperty(Diamond.prototype, Symbol.toStringTag, {
		value: `Diamond<${baseClasses.map((base) => base.name).join(',')}>`,
	})
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
		if (fLegs(base)) {
			nextResponsibility = []
			buildingStrategy.push({
				target: bottomLeg(base),
				subs: nextResponsibility,
			})
		}
	}
	const linear = bases.reduce((acc, fl) => acc.concat([...linearLeg(fl)]), [] as Ctor[])
	const mainBase = linear.shift() || Object
	let proxiedPrototype = (linear.pop() || Object).prototype
	while (linear.length) {
		proxiedPrototype = new Proxy(
			linear.pop()!.prototype,
			((proxiedPrototype) => ({
				getPrototypeOf: (_) => proxiedPrototype,
			}))(proxiedPrototype)
		)
	}
	const prototype = new Proxy(mainBase.prototype, {
		get(target, p, receiver) {
			if (receiver === prototype && Object.getOwnPropertyDescriptor(target, p))
				return Reflect.get(target, p, target)
			const pd = nextInFLeg(receiver.constructor, p, Diamond)
			return pd
				? 'value' in pd
					? pd.value
					: pd.get
						? pd.get!.call(receiver)
						: undefined
				: ({} as any)[p]
		},
		set(target, p, v, receiver) {
			if (receiver === prototype && Object.getOwnPropertyDescriptor(target, p))
				return Reflect.get(target, p, target)
			const pd = nextInFLeg(receiver.constructor, p, Diamond)
			if (!pd || pd.writable)
				Object.defineProperty(receiver, p, {
					value: v,
					writable: true,
					enumerable: true,
					configurable: true,
				})
			else if (pd?.set) pd.set.call(receiver, v)
			else return false
			return true
		},
		getPrototypeOf: (_) => proxiedPrototype,
	})
	Object.setPrototypeOf(Diamond.prototype, prototype)
	return Diamond as Newable<HasBases<TBases>>
}
