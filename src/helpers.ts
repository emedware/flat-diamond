import { Ctor } from './types'
import { fLegs } from './utils'

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
