import Diamond, { diamondHandler } from './diamond'
import { constructedObject } from './helpers'
import { allFLegs, bottomLeg, nextInLine } from './utils'

const publicPart = (x: Ctor): Ctor => Object.getPrototypeOf(Object.getPrototypeOf(x))

export function Protect<TBase extends Ctor, Keys extends (keyof InstanceType<TBase>)[]>(
	base: TBase,
	properties: Keys
): Protected<TBase, Keys> {
	const protectedProperties: KeySet = properties.reduce(
		(acc, p) => ({ ...acc, [p]: true }) as KeySet,
		{}
	)
	const privates = new WeakMap<Protected, TBase>()
	const diamond = Diamond(base) as TBase
	class Protected extends (diamond as any) {
		static privatePart(obj: TBase): TBase | undefined {
			return privates.get(obj)
		}
		constructor(...args: any[]) {
			super(...args)
			const actThis = constructedObject(this)
			privates.set(
				actThis,
				Object.create(
					// This proxy is used to write public properties in the prototype (the public object)
					new Proxy(actThis, {
						set(target, p, value, receiver) {
							Object.defineProperty(p in protectedProperties ? receiver : target, p, {
								value,
								writable: true,
								enumerable: true,
								configurable: true
							})
							return true
						},
						getPrototypeOf: (target) => target
					})
				)
			)
		}
	}
	function whoAmI(receiver: TBase) {
		const domain = privates.has(receiver)
			? 'public'
			: privates.get(publicPart(receiver)) === receiver
				? 'private'
				: 'error'
		// If it's not tested, it means all the tests pass: this should never happen
		if (domain === 'error') throw new Error('Invalid domain')
		return {
			domain,
			public: domain === 'public' ? receiver : publicPart(receiver),
			private: domain === 'private' ? receiver : privates.get(receiver)!
		}
	}
	function fakeCtor() {}
	fakeCtor.prototype = new Proxy(base, {
		getOwnPropertyDescriptor(target, p) {
			if (p in target.prototype) {
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
			if (p === 'constructor') return fakeCtor
			const actor = whoAmI(receiver)
			if (p in target.prototype) {
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
			if (p in protectedProperties && actor.domain === 'private')
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

			if (p in protectedProperties && actor.domain === 'private') {
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
		//getPrototypeOf: (target): any => fakeCtor.prototype
		getPrototypeOf: (target) => diamond.prototype
	})
	Object.setPrototypeOf(Protected.prototype, fakeCtor.prototype)
	return Protected as any
}
