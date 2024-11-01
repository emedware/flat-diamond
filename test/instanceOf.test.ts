import D, { instanceOf } from '..'
class A1 {}
class A2 extends A1 {}
class B1 {}
class B2 extends B1 {}
class C1 extends D() {}
class C2 extends C1 {}
class D1 extends D(A1, B1) {}
class D2 extends D1 {}

class X1 extends D(A2, B2) {}
class X2 extends D(C2, D2) {}

const x1 = new X1(),
	x2 = new X2()
test('instanceOf', () => {
	expect(instanceOf(x1, X1)).toBe(true)
	expect(instanceOf(x1, X2)).toBe(false)
	expect(instanceOf(x2, X1)).toBe(false)
	expect(instanceOf(x2, X2)).toBe(true)

	expect(instanceOf(x1, A1)).toBe(true)
	expect(instanceOf(x1, B1)).toBe(true)
	expect(instanceOf(x1, C1)).toBe(false)

	expect(instanceOf(x2, A1)).toBe(true)
	expect(instanceOf(x2, B1)).toBe(true)
	expect(instanceOf(x2, A2)).toBe(false)
	expect(instanceOf(x2, B2)).toBe(false)
	expect(instanceOf(x2, C1)).toBe(true)
})
test('instanceof', () => {
	expect(x1 instanceof X1).toBe(true)
	expect(x1 instanceof X2).toBe(false)
	expect(x2 instanceof X1).toBe(false)
	expect(x2 instanceof X2).toBe(true)

	expect(x1 instanceof A1).toBe(false)
	expect(x1 instanceof B1).toBe(false)
	expect(x1 instanceof C1).toBe(false)
	expect(x2 instanceof A1).toBe(false)
	expect(x2 instanceof B1).toBe(false)
	expect(x2 instanceof A2).toBe(false)
	expect(x2 instanceof B2).toBe(false)
	expect(x2 instanceof C1).toBe(true)
})
