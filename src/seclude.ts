import Diamond, { diamondHandler, hasInstanceManager } from './diamond'
import { Ctor, KeySet, Newable } from './types'
import {
	allFLegs,
	bottomLeg,
	fLegs,
	nextInLine,
	secludedPropertyDescriptor,
	secludedProxyHandler
} from './utils'

const publicPart = (x: Ctor): Ctor => Object.getPrototypeOf(Object.getPrototypeOf(x))
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
	Keys extends (keyof InstanceType<TBase>)[]
> = SecludedClass<TBase, Keys> & {
	secluded(obj: InstanceType<SecludedClass<TBase, Keys>>): InstanceType<TBase> | undefined
}
export function Seclude<TBase extends Ctor, Keys extends (keyof InstanceType<TBase>)[]>(
	base: TBase,
	//@ts-expect-error Cannot convert `never[]` to `Keys`
	properties: Keys = []
): Secluded<TBase, Keys> {
	const secludedProperties: KeySet = properties.reduce(
			(acc, p) => ({ ...acc, [p]: true }) as KeySet,
			{}
		),
		initPropertiesBasket: BasketBall[] = []
	/**
	 * In order to integrate well in diamonds, we need to be a diamond
	 * When we create a diamond between the Secluded and the base, the private properties of the base *have to*
	 * be collected before the diamond propagate them to the constructed object
	 */
	abstract class PropertyCollector extends base {
		constructor(...args: any[]) {
			super(...args)
			initPropertiesBasket[0].initialObject = this
			const { privateProperties } = initPropertiesBasket[0],
				allProps = Object.getOwnPropertyDescriptors(this)
			for (const p in secludedProperties)
				if (p in allProps) {
					privateProperties[p] = allProps[p]
					delete this[p]
				}
		}
	}
	const privates = new WeakMap<GateKeeper, TBase>(),
		diamondSecluded = !fLegs(base),
		diamond = diamondSecluded ? Diamond(PropertyCollector) : PropertyCollector
	// We make sure `Secluded(X).secluded(x) instanceof X`
	if (diamondSecluded) {
		Object.defineProperty(base, Symbol.hasInstance, {
			value: hasInstanceManager(base),
			configurable: true
		})
	}
	class GateKeeper extends diamond {
		static secluded(obj: TBase): TBase | undefined {
			return privates.get(obj)
		}
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
				//@ts-expect-error ProxyHandler<this> ??
				protoProxy = new Proxy(this, secludedProxyHandler(base, secludedProperties))
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
				for (const p of [
					...Object.getOwnPropertyNames(secluded),
					...Object.getOwnPropertySymbols(secluded)
				])
					delete secluded[p]
				Object.defineProperties(secluded, init.privateProperties)
				Object.setPrototypeOf(secluded, protoProxy)
			}
			privates.set(this, secluded)
		}
	}
	function whoAmI(receiver: TBase) {
		const domain = privates.has(receiver)
			? 'public'
			: privates.get(publicPart(receiver)) === receiver
				? 'private'
				: 'error'
		// If it's not test-covered, it means all the tests pass: this should never happen
		if (domain === 'error') throw new Error('Invalid domain')
		return {
			domain,
			public: domain === 'public' ? receiver : publicPart(receiver),
			private: domain === 'private' ? receiver : privates.get(receiver)!
		}
	}
	// `Diamond` browse legacies and constructors a lot - we need to provide something
	function fakeCtor() {}
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
							return pd.value.apply(privates.get(this) || this, args)
						}
					}
				else {
					let modified = { ...pd }
					if ('get' in pd)
						modified.get = function (this: any) {
							return pd.get!.call(privates.get(this) || this)
						}
					if ('set' in pd)
						modified.set = function (this: any, value: any) {
							return pd.set!.call(privates.get(this) || this, value)
						}
					return modified
				}
			}
			return undefined
		},
		get: (target, p, receiver) => {
			switch (p) {
				case 'constructor':
					return fakeCtor
				case Symbol.toStringTag:
					return `[Secluded<${target.name}>]`
			}
			const actor = whoAmI(receiver)
			if (p in target.prototype && (!(p in secludedProperties) || actor.domain === 'private')) {
				const pd = nextInLine(target, p)!
				if ('get' in pd) return pd.get!.call(actor.private)
				if ('value' in pd) {
					const rv = pd.value!
					return typeof rv === 'function'
						? function (this: any, ...args: any) {
								return rv.apply(actor.private, args)
							}
						: rv
				}
				// No legacy involved: it was well defined in our classes but `readable: false` ...
				return undefined
			}
			if (p in secludedProperties && actor.domain === 'private')
				// If we arrive here, it means it's private but not set in the private part
				return undefined
			if (allFLegs.has(actor.public)) return diamondHandler.get(bottomLeg(target), p, receiver)
			// If we arrive here, it means it's public but not set in the public part
			return undefined
		},
		set: (target, p, value, receiver) => {
			const actor = whoAmI(receiver)
			if (p in target.prototype) {
				const pd = nextInLine(target, p)!
				if ('set' in pd) {
					pd.set!.call(actor.private, value)
					return true
				}
				if (!pd.writable) return false
			}

			if (p in secludedProperties && actor.domain === 'private') {
				Object.defineProperty(receiver, p, {
					value,
					writable: true,
					enumerable: true,
					configurable: true
				})
				return true
			}
			if (allFLegs.has(actor.public))
				return diamondHandler.set(bottomLeg(target), p, value, receiver)
			Object.defineProperty(actor.public, p, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			})
			return true
		},
		getPrototypeOf: (target) => diamond.prototype
	})
	Object.setPrototypeOf(GateKeeper.prototype, fakeCtor.prototype)
	return GateKeeper as any
}
