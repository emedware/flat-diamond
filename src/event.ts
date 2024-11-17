const eventsProperty = Symbol('events')

type CallBack<TThis extends Eventful = Eventful> = (this: TThis, ...args: any[]) => any
type Events<TThis extends Eventful> = Record<PropertyKey, CallBack<TThis>>
type EventRegistrations<TThis extends Eventful = Eventful> = Record<PropertyKey, CallBack<TThis>[]>

export class Eventful {
	[eventsProperty]: EventRegistrations = {}

	constructor(...args: any[]) {
		Object.defineProperty(this, eventsProperty, { value: this[eventsProperty], enumerable: false })
	}
	on<TThis extends Eventful>(
		this: TThis,
		event: PropertyKey,
		handler: CallBack<TThis>
	): () => void {
		this[eventsProperty][event] ??= []
		this[eventsProperty][event].push(handler as CallBack)
		return () => this.off(event, handler)
	}
	emit(event: PropertyKey, ...args: any[]) {
		const handlers = [...this[eventsProperty][event]]

		for (
			let browser = Object.getPrototypeOf(this);
			browser !== Object.prototype;
			browser = Object.getPrototypeOf(browser)
		) {
			const ownHandlers =
				Object.getOwnPropertyDescriptor(browser, eventsProperty) && browser[eventsProperty][event]
			if (ownHandlers) handlers.unshift(...ownHandlers)
		}
		const alreadyCalled = new Set()
		for (const handler of handlers)
			if (!alreadyCalled.has(handler)) {
				alreadyCalled.add(handler)
				const rv = handler.apply(this, args)
				if (rv !== undefined) return rv
			}
	}

	off<TThis extends Eventful>(event: PropertyKey, handler: CallBack<TThis>) {
		const handlers = this[eventsProperty][event]
		if (handlers) this[eventsProperty][event] = handlers.filter((h) => h !== handler)
	}

	once<TThis extends Eventful>(event: PropertyKey, handler: CallBack<TThis>) {
		const off = this.on(event, (...args: any[]) => {
			handler.apply(this, args)
			off()
		})
	}
}

export function events<TThis extends typeof Eventful>(e: Events<InstanceType<TThis>>) {
	return function EventsDecorator(target: TThis) {
		Object.defineProperty(target.prototype, eventsProperty, {
			value: Object.fromEntries(
				Object.entries(e).map(([event, handler]) => [event, [handler]])
			) as EventRegistrations,
		})
	}
}
