import Diamond, { lastDiamondProperties } from './diamond'
import type { Ctor, KeySet, Newable } from './types'
import {
	allFLegs,
	bottomLeg,
	fLegs,
	nextInLine,
	secludedPropertyDescriptor,
	secludedProxyHandler,
} from './utils'
/**
 * Internally used for communication between `PropertyCollector` and `Secluded`
 * This is the "baal" `Secluded` send into the "basket" (stack in case a secluded class inherits another secluded class)
 * and retrieve with its data fulfilled by `PropertyCollector`
 */
interface BasketBall {
	privateProperties: PropertyDescriptorMap
	initialObject?: any
}
type SecludedClass<TBase extends Ctor, Keys extends (keyof InstanceType<TBase>)[]> = Newable<
	Omit<InstanceType<TBase>, Keys[number]>
>
export type Secluded<
	TBase extends Ctor,
	Keys extends (keyof InstanceType<TBase>)[],
> = SecludedClass<TBase, Keys> &
	((obj: InstanceType<SecludedClass<TBase, Keys>>) => InstanceType<TBase> | undefined)
export function Seclude<TBase extends Ctor, Keys extends (keyof InstanceType<TBase>)[]>(
	base: TBase,
	//@ts-expect-error Cannot convert `never[]` to `Keys`
	properties: Keys = []
): Secluded<TBase, Keys> {
	const secludedProperties: KeySet = properties.reduce(
		(acc, p) => ({ ...acc, [p]: true }) as KeySet,
		Object.create(null)
	)
	const initPropertiesBasket: BasketBall[] = []
	const privates = new WeakMap<GateKeeper, TBase>()
	const diamondSecluded = !fLegs(base)
	/**
	 * In order to integrate well in diamonds, we need to be a diamond
	 * When we create a diamond between the Secluded and the base, the private properties of the base *have to*
	 * be collected before the diamond propagate them to the constructed object
	 */
	abstract class PropertyCollector extends base {
		constructor(...args: any[]) {
			super(...args)
			initPropertiesBasket[0].initialObject = this
			const { privateProperties } = initPropertiesBasket[0]
			const allProps = Object.getOwnPropertyDescriptors(this)
			for (const p in secludedProperties)
				if (p in allProps) {
					privateProperties[p] = allProps[p]
					// If we seclude, we seclude only until the next diamond
					if (!diamondSecluded && lastDiamondProperties?.[p])
						Object.defineProperty(this, p, lastDiamondProperties[p])
					else delete this[p]
				}
		}
	}
	const diamond = diamondSecluded ? Diamond(PropertyCollector) : PropertyCollector
	class GateKeeper extends diamond {
		/*static (obj: GateKeeper): TBase | undefined {
			return privates.get(obj)
		}*/
		constructor(...args: any[]) {
			const init: BasketBall = { privateProperties: {} }
			initPropertiesBasket.unshift(init)
			try {
				super(...args)
			} finally {
				initPropertiesBasket.shift()
			}
			const // This proxy is used to write public properties in the prototype (the public object) and give
				// access to the private instance methods. It's the one between `Secluded` and the main object
				protoProxy = new Proxy(
					this,
					//@ts-expect-error ProxyHandler<this> ??
					secludedProxyHandler(base, secludedProperties)
				)
			let secluded: InstanceType<TBase>
			/* Here, what happens:
			`init.initialObject` is the instance of the secluded class who contains all its public properties
			`init.privateProperties` is a pure object containing all its private properties
			We need the initial object but with only the private properties
			1- we remove all the public ones
			2- we restore the private ones
			*/
			// Except when we're the main class, or when the secluded is a diamond, then we create a new object
			if (!diamondSecluded) secluded = Object.create(protoProxy, init.privateProperties)
			else {
				secluded = init.initialObject!
				// No need to empty the own properties: this has been done in `Diamond` `if (locallyStoredDiamond.built !== temp)`
				Object.defineProperties(secluded, init.privateProperties)
				Object.setPrototypeOf(secluded, protoProxy)
			}
			privates.set(this, secluded)
		}
	}
	// In order to be treated as a function (to retrieve the private part), we have to use yet another proxy
	// Making `GateKeeper` as a function directly and setting its prototype to `diamond` does not allow
	// `super(...)` equivalent
	const GateKeeperProxy = new Proxy(GateKeeper, {
		apply(target, thisArg, argArray) {
			return privates.get(argArray[0])
		},
	})
	GateKeeper.prototype.constructor = GateKeeperProxy
	// `Diamond` browse legacies and constructors a lot - we need to provide something
	function fakeCtor() {}
	function assertSecluded(receiver: GateKeeper) {
		const rv = privates.get(receiver)
		/* istanbul ignore next: internal bug guard */
		if (!rv) throw new Error('Secluded object not created')
		return rv
	}
	/**
	 * Mambo jumbo to determine who is `this`
	 * Because the prototype becomes the object being constructed, we have to invent a constructor who has this object
	 * as prototype
	 */
	fakeCtor.prototype = new Proxy(base, {
		getOwnPropertyDescriptor(target, p) {
			if (p in target.prototype) {
				if (p in secludedProperties) return secludedPropertyDescriptor
				const pd = nextInLine(target, p)!
				if ('value' in pd && typeof pd.value === 'function')
					return {
						...pd,
						value: function (this: any, ...args: any) {
							return pd.value.apply(assertSecluded(this), args)
						},
					}
				const modified = { ...pd }
				if (pd.get)
					modified.get = function (this: any) {
						return pd.get!.call(assertSecluded(this))
					}
				if (pd.set)
					modified.set = function (this: any, value: any) {
						return pd.set!.call(assertSecluded(this), value)
					}
				return modified
			}
			return undefined
		},
		get(target, p, receiver) {
			switch (p) {
				case 'constructor':
					return fakeCtor
				case Symbol.toStringTag:
					return `Secluded<${target.name}>`
			}
			const secluded = assertSecluded(receiver)
			if (p in target.prototype && !(p in secludedProperties)) {
				const pd = nextInLine(target, p)!
				if (!pd) return Reflect.get(target.prototype, p, receiver)
				if (pd.get) return pd.get!.call(secluded)
				if ('value' in pd) {
					const rv = pd.value!
					return typeof rv === 'function'
						? function (this: any, ...args: any) {
								return rv.apply(secluded, args)
							}
						: rv
				}
				// No legacy involved: it was well defined in our classes but `readable: false` ...
				return undefined
			}
			// if `receiver` is a diamond, pass the hand to "fLeg" management (the diamond, `bottomLeg`)
			if (fLegs(target)) return Reflect.get(bottomLeg(target), p, receiver)
			// If we arrive here, it means it's public but not set in the public part
			return undefined
		},
		set(target, p, value, receiver) {
			const secluded = assertSecluded(receiver)
			if (p in target.prototype) {
				const pd = nextInLine(target, p)!
				if (pd.set) {
					pd.set!.call(secluded, value)
					return true
				}
				if (!pd.writable) return false
			}
			if (fLegs(target)) return Reflect.set(bottomLeg(target), p, value, receiver)
			Object.defineProperty(receiver, p, {
				value,
				writable: true,
				enumerable: true,
				configurable: true,
			})
			return true
		},
		getPrototypeOf: () => diamond.prototype,
	})
	Object.setPrototypeOf(GateKeeper.prototype, fakeCtor.prototype)
	return GateKeeperProxy as any
}
