import D, { instanceOf } from '..'
class A1 {}
class A2 extends A1 {}
class B1 {}
class B2 extends B1 {}
class C1 {}
class C2 extends C1 {}
class D1 extends D(A1, B1) {}
class D2 extends D1 {}

class X1 extends D(A2, B2) {}
class X2 extends D(C2, D2) {}

test('instanceOf', () => {
	expect(instanceOf(new X1(), X1)).toBe(true)
	expect(instanceOf(new X1(), X2)).toBe(false)
	expect(instanceOf(new X2(), X1)).toBe(false)
	expect(instanceOf(new X2(), X2)).toBe(true)

	expect(instanceOf(new X1(), A1)).toBe(true)
	expect(instanceOf(new X1(), B1)).toBe(true)
	expect(instanceOf(new X1(), C1)).toBe(false)

	expect(instanceOf(new X2(), A1)).toBe(true)
	expect(instanceOf(new X2(), B1)).toBe(true)
	expect(instanceOf(new X2(), A2)).toBe(false)
	expect(instanceOf(new X2(), B2)).toBe(false)
	expect(instanceOf(new X2(), C1)).toBe(true)
})
