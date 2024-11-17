import Diamond from '../src'

class X {}

class A extends Diamond(X) {}

class B extends A {}
class C extends A {}

class D extends Diamond(B, C) {}

test('prototype console', () => {
	const d = new D()

	for (
		let browser = Object.getPrototypeOf(d);
		browser !== Object.prototype;
		browser = Object.getPrototypeOf(browser)
	) {
		console.log(browser.constructor.name)
	}
})
test('prototype line', () => {
	const expected = ['D', 'Diamond', 'B', 'A', 'C', 'A', 'X', 'Object']
	const d = new D()

	for (
		let browser = Object.getPrototypeOf(d);
		browser !== Object.prototype;
		browser = Object.getPrototypeOf(browser)
	) {
		expect(browser.constructor.name).toBe(expected.shift())
	}
	expect(expected).toEqual(['Object'])
})
