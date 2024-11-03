import { Ctor, HasBases, Newable } from './types'
import { allFLegs, bottomLeg, fLegs, forwardProxyHandler, nextInFLeg } from './utils'

type BuildingStrategy = Map<Ctor, Ctor[]>
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

export function hasInstanceManager<Class extends Ctor>(cls: Class) {
	return (obj: any) => {
		if (!obj || typeof obj !== 'object') return false
		const objBottom = bottomLeg(obj.constructor)
		if (objBottom === cls) return true
		const fLeg = allFLegs.get(objBottom)
		return Boolean(fLeg && fLeg.some((base) => bottomLeg(base) === cls))
	}
}

function forwardTempTo(target: any, temp: any) {
	Object.defineProperties(target, Object.getOwnPropertyDescriptors(temp))
	for (const p of Object.getOwnPropertyNames(temp)) delete temp[p]
	Object.setPrototypeOf(temp, new Proxy(target, forwardProxyHandler))
}

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
			const responsibility = buildingDiamond
				? buildingDiamond!.strategy.get(this.constructor as Ctor)!
				: myResponsibility
			if (!buildingDiamond)
				buildingDiamond = {
					built: this,
					strategy: buildingStrategy
				} // It will be set to `null` on purpose in the process and needs to be restored
			const locallyStoredDiamond = buildingDiamond!.built
			try {
				// `super()`: Builds the temporary objects and import all their properties
				for (const subs of responsibility) {
					const temp = new (subs as any)(...args) // `any` because declared as an abstract class
					// Even if `Diamond` managed: property initializers do not go through proxy
					if (locallyStoredDiamond !== temp) forwardTempTo(locallyStoredDiamond, temp)
				}
			} finally {
				if (locallyStoredDiamond !== this) forwardTempTo(locallyStoredDiamond, this)
				buildingDiamond = null
			}
			return locallyStoredDiamond
		}
		static [Symbol.hasInstance] = hasInstanceManager(Diamond)
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
