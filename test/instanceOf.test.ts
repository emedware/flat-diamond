import D, { Seclude } from '../src'
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

test('instanceof', () => {
	expect(x1 instanceof X1).toBe(true)
	expect(x1 instanceof X2).toBe(false)
	expect(x2 instanceof X1).toBe(false)
	expect(x2 instanceof X2).toBe(true)

	expect(x1 instanceof A1).toBe(true)
	expect(x1 instanceof B1).toBe(true)
	expect(x1 instanceof C1).toBe(false)
	expect(x2 instanceof A1).toBe(true)
	expect(x2 instanceof B1).toBe(true)
	expect(x2 instanceof A2).toBe(false)
	expect(x2 instanceof B2).toBe(false)
	expect(x2 instanceof C1).toBe(true)
})

test('secluded', () => {
	class X {}
	const S = Seclude(X)
	const s = new S()
	expect(s instanceof S).toBe(true)
	expect(s instanceof X).toBe(true)
	expect(S(s) instanceof S).toBe(true)
	// Still wondering... Is `MountedPlane` (a `Plane` without `wingSpan`) a `Plane` ?
	expect(S(s) instanceof X).toBe(true)
})
