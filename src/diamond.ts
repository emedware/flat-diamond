import { allFLegs, bottomLeg, fLegs, nextInFLeg, temporaryBuiltObjects } from './utils'

let buildingDiamond: {
	built: object
	strategy: BuildingStrategy
} | null = null

export const diamondHandler: {
	getPrototypeOf(target: Ctor): Ctor
	get(target: Ctor, p: PropertyKey, receiver: Ctor): any
	set(target: Ctor, p: PropertyKey, v: any, receiver: Ctor): boolean
} & ProxyHandler<Ctor> = {
	get(target, p, receiver) {
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
					: buildingDiamond!.strategy.get(this.constructor as Ctor)!
			if (itsMe)
				buildingDiamond = {
					built: this,
					strategy: buildingStrategy
				} // It will be set to `null` on purpose in the process and needs to be restored
			const locallyStoredDiamond = buildingDiamond!
			try {
				// `super()`: Builds the temporary objects and import all their properties
				for (const subs of responsibility) {
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
