[![view on npm](https://badgen.net/npm/v/flat-diamond)](https://www.npmjs.org/package/flat-diamond)
[![Node.js CI](https://github.com/emedware/flat-diamond/actions/workflows/node.js.yml/badge.svg)](https://github.com/emedware/flat-diamond/actions/workflows/node.js.yml)

# Flat Diamond

Multiple inheritance has always has been a topic, if not a debate.

In this library, it is resolved by "flattening" the legacy.

Single inheritance works as such :

Existing inheritance: `A - B - C`.
When writing `class X extends A`, we find the inheritance `X - A - B - C`

Flattened inheritance: `X - I` and `A - I`.
When writing `class O extends X, A`, we find the flat legacy `O - X - A - I`

Flattening operation for `[ X, A ]`

```
X - Y \
       I - J
A - B /
```

becomes:

```
X - Y - A - B - I - J
```

So, basically, everything ends up in a classic legacy scheme that can be managed by typescript.

> Note: Of course, the class `Y` has not been modified, this flat legacy is particular to `O` and `Y` can appear in many others with many other "direct parents"

## But the syntax does not exist!

Yes, that is the why of this library

```ts
import Diamond from `flat-diamond`

class A { ... }
class B { ... }
class C extends Diamond(A, B) { ... }
```

### `super`!

Yes, `super` still works and will have a dynamic meaning depending on where it is used.

```ts
import D from `flat-diamond`

class X extends D() { method() {} }
class A extends D(X) { method() { [...]; super.method() } }    // Here will be the change
class B extends D(X) { method() { [...]; super.method() } }
class C extends D(A, B) {}
let testA = new A(),    // A - X
    testC = new C()     // C - A - B - X
testA.method()
testC.method()
```

In the first case (`testA.method()`), the `super.method()` will call the one defined in `X`. In the second case (`testC.method()`), when the one from class `A` will be invoked, the `super.method()` will call the one defined in `B` who will in turn call the one defined in `X`

### A bit made up ?

No, and even well constructed! In the previous example (`C - A - B - X`), invoking `new C()` will invoke the constructors of `C`, `A`, `B` then `X` in sequence (roughly)

> :warning: Not on the same object, even if it really feels the same.
> When constructing, `this` is a temporary object and it cannot be used as a reference - as discussed [below](#substitute-for-this-stability)

## But ... How ?

The class created by the library (`Diamond(A, B)`) has a `Proxy` `prototype` (understand who can) who allow accessing the whole legacy of an object, from its constructor 'flat legacy'.

### There is no `get constructor()`

The construction scheme is a bit complex as a `Diamond` class is geared to build its legacy and the legacy of others.

This means that the information about who inherits from you comes ... from who you inherit from.

Ie., this is the difference between these two situations :

```ts
class A { constructor() {...} }
class Xa extends D(A) { constructor() { super(); ...} }

class B extends D() { constructor() { super(); ...} }
class Xb extends D(B) { constructor() { super(); ...} }

let testA = new Xa(),
    testB = new Xb()
```

When constructing `Xa`, the constructor of `A` will be invoked with `this` being of class `A`

When constructing `Xb`, the constructor of `B` will be invoked with `this` being (after `super()`) of class `Xb`

> Note: This is the only difference made by using `extend D()` for root classes

## What are the limits ?

We can of course `extend Diamond(A, B, C, D, E, ...theRest)`.

### `instanceof` does not work anymore!

It still works. Well, it indeed works - but only if the class being tested is a `Diamond` one (if it inherits from `Diamond(...)` or if one of its direct ancestor does).

If not, there is a helper function for the super-generic case.

```ts
import Diamond, { instanceOf } from 'flat-diamond'
```

### But I modify my prototypes dynamically...

Cool. It's working too... Keep on rocking! As the technology used is a `Proxy`, you can even add a property in a sub-sub-class' prototype, [it will be found](./test/dynamic.test.ts#dynamic-diamond).

### Order conflicts

Resolved by stating that the argument order of the function `Diamond(...)` is _consultative_

```ts
class X1 { ... }
class X2 { ... }
class D1 extends D(X1, X2) { ... }
class X3 { ... }
class X4 { ... }
class D2 extends D(X1, X3, D1, X4, X2)
```

Here, the flat legacy od `D2` will be `D1 - X1 - X3 - X2 - X4`. The fact that `D1` specifies it inherits from `X1` is promised to be kept, the order in the arguments is surely going to happen if the situation is not too complex.

A real order conflict would imply circular reference who is any impossible.

### Dealing with non-`Diamond`-ed classes

```ts
class X extends D() { ... }
class Y extends X { ... }
class Z extends X { ... }
class A extends D(X, Y) { ... }
```

Well, the constructor and `super.method(...)` of `X` will be called twice.... Like if it did not extend `D()`

> :warning: It goes without saying that classes who participate in the `Diamond` game have to inherit `Diamond(...)` - even if they inherit from only one class.

For the library, a class implementing another without going through the `Diamond` process is just a block, like a single class, that cannot be separated or reorganized.

### Abstraction

`new Diamond(...)` is possible even if it still has abstract members. Yes, it can inherit abstract classes though the typings are not always possible there, and some `//@ts-ignore` might be needed.

The only problem still worked on is that if a class who has no implementation for an abstract method appears before another one who has an implementation, the method will be considered abstract (so the order of arguments for `Diamond(...)` matters here), even though a `//@ts-ignore` does the job.

> :arrow_up: Btw, if someone could help me here... It's on `HasBases` type definition

### Construction concern

The main concern is about the fact that a class can think it extends directly another and another class can "come" in between in some legacy schemes. It is mainly concerning for constructors.

The best way to palliate is to use option objects for constructor arguments.

When a `Diamond`-ed class constructor passes an argument to `super`, this argument will be used for its descendant but also all the descendants between itself and the next `Diamond`-ed class.

```ts
class X1 { constructor(n: number) { ... } }
class D1 extends D(X1) { constructor(n: number) { super(n+1); ... } }
class X2 { constructor(n: number) { ... } }
class X3 extends X2 { constructor(n: number) { super(n+2); ... } }
class D2 extends D(X3, D1) { constructor(n: number) { super(n+1); ... } }

let test = new D2(0)
```

Constructors will occur like this (indentation means we entered a `super`)

```
D2(0)
    D1(1)
        X1(3)
    X3(1)
        X2(2)
```

## Substitute for `this` stability

Because constructors cannot be invoked like other functions (it was simpler in older days), the objects have to be duplicated on construction.

For instance, one cannot use :

```ts
    constructor() {
        super{}
        instances.register(this);
    }
```

### When we are writing the class

When constructing a class who inherit (directly or indirectly) a `Diamond`, the function `constructedObject` helps you retrieve the actual instance being constructed - this is the one you want to refer to.

```ts
import D, { constructedObject } from 'flat-diamond'
...
    constructor() {
        super()
        instances.register(constructedObject(this))
    }
```

> Note: There is no need to modify it directly, all the properties initialized on the temporary object are going to be transposed on it
> Note: `constructedObject(this)` will return a relevant value _only_ in classes extending `Diamond(...)` after `super(...)`

### When the class is from a library

[Seclusion](#seclusion-and-construction) is your friend

# Seclusion

Another big deal of diamond inheritance is field conflicts.

## Easy case

You write all the classes and, when remembering a `wingSpan`, you know that a plane is not a duck. You either have a plane wit a duck inside (property) or a duck that imitates a plane - but you don't confuse your `wingSpan`s.

Don't make field conflicts. Just don't.

## Yes, but it's a library I don't write

Here it is tricky, and that's where _seclusion_ comes in. Let's speak about seclusion without speaking of diamond - and, if you wish, the seclusion works without the need of involving `Diamond`. (though it is also completely integrated)

Let's say we want a `DuckCourier` to implement `Plane`, and end up with a conflict of `wingSpan` (the one of the duck and the one of the device strapped on him, the `Plane` one)

A pure and simple `class DuckCourier extends Plane` would have a field conflict. So, instead, seclusion will be used :

```ts
import { Seclude } from 'flat-diamond'

class DuckCourier extends Seclude(Plane, ['wingSpan']) { ... }
```

As simple as that, methods (as well as accessors) of `Plane` and `DuckCourier` will access two different values when accessing `this.wingSpan`

## But ... How ? And, how can I ...

When a secluded class is implemented, the `Plane` instance prototype will be replaced by `this` (so, here, a `DuckCourier`). Some `Proxy` voodoo is juggled with to manage who is `this` in method calls (either `DuckCourier` or `Secluded<Plane>`) - et voilà!

Because of prototyping, `Secluded<Plane>` has access to all the functionalities of `DuckCourier` (and therefore of `Plane`) while never interfering with `DuckCourier::wingSpan`. Also, having several secluded class in the legacy list will only create several "heads" who will share a prototype.

`DuckCourier` on another hand, _can_ interfere with `Plane::wingSpan` if needed thanks to the `secluded` exposed by the `Secluded` class.

```ts
import { Seclude } from 'flat-diamond'

class Plane {
	wingSpan: number = 200
}

const SecludedPlane = Seclude(Plane, ['wingSpan'])

class DuckCourier extends SecludedPlane {
	wingSpan: number = 80
	get isDeviceSafe(): boolean {
		return SecludedPlane.secluded(this).wingSpan > 2 * this.wingSpan
	}
}
```

## Seclusion and construction

The `Secluded<Plane>` will indeed be the object the `Plane` constructor built! If it was used in the references, it's perfect!

## Limitations

For now, only the fields can be secluded, not the methods

# Participation

The best (even if not only) way to report a bug is to PR a failing unit test.

I have been really struggling with the [`HasBases` issue](#abstraction) and didn't find a way to detect in Typescript types definition if a method is abstract or not - if someone has an idea.
