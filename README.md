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
import Diamond from `flat-diamond`

class X extends Diamond() { method() {} }
class A extends Diamond(X) { method() { [...]; super.method() } }    // Here will be the change
class B extends Diamond(X) { method() { [...]; super.method() } }
class C extends Diamond(A, B) {}
let testA = new A(),    // A - X
    testC = new C()     // C - A - B - X
testA.method()
testC.method()
```

In the first case (`testA.method()`), the `super.method()` will call the one defined in `X`. In the second case (`testC.method()`), when the one from class `A` will be invoked, the `super.method()` will call the one defined in `B` who will in turn call the one defined in `X`

Also note that `Diamond(...)` are useful even when inheriting no or one class: The `Diamond` between `A` and `X` here allows the library to reorganize the classes. Without it, the `super` of `A` would always end up in `X`.

### A bit made up ?

No, and even well constructed! In the previous example (`C - A - B - X`), invoking `new C()` will invoke the constructors of `C`, `A`, `B` then `X` in sequence.

# Explanations and edge cases

> :bell: The following is for details on edge cases and explanations on "how to" and how it works. The documentation needed to be able to use it is above.

## But ... How ?

The class created by the library (`Diamond(A, B)`) has a `Proxy` `prototype` (understand who can) who allow accessing the whole legacy of an object, from its constructor 'flat legacy'.

## There is no `get constructor()`

The construction scheme is a bit complex as a `Diamond` class is geared to build its legacy and the legacy of others.

This means that the information about who inherits from you comes ... from who you inherit from.

Ie., this is the difference between these two situations :

```ts
class A { constructor() {...} }
class Xa extends Diamond(A) { constructor() { super(); ...} }

class B extends Diamond() { constructor() { super(); ...} }
class Xb extends Diamond(B) { constructor() { super(); ...} }

let testA = new Xa(),
    testB = new Xb()
```

When constructing `Xa`, the constructor of `A` will be invoked with `this` being of class `A`

When constructing `Xb`, the constructor of `B` will be invoked with `this` being (after `super()`) the constructed diamond (here, `Xb`)

> Note: This is the only difference made by using `extend Diamond()` for root classes

## What are the limits ?

We can of course `extend Diamond(A, B, C, D, E, ...theRest)`.

### `instanceof` does not work anymore!?

Yes, it does. Classes involved in the `Diamond` process even have their `[Symbol.hasInstance]` overridden in order to take the new structure into account.

### But I modify my prototypes dynamically...

Cool. It's working too... Keep on rocking! As the technology used is a `Proxy`, you can even add a property in a sub-sub-class' prototype, [it will be found](./test/dynamic.test.ts#dynamic-diamond).

### Order conflicts

Resolved by stating that the argument order of the function `Diamond(...)` is _consultative_

```ts
class X1 { ... }
class X2 { ... }
class D1 extends Diamond(X1, X2) { ... }
class X3 { ... }
class X4 { ... }
class D2 extends Diamond(X1, X3, D1, X4, X2)
```

Here, the flat legacy of `D2` will be `D1 - X1 - X3 - X2 - X4`. The fact that `D1` specifies it inherits from `X1` is promised to be kept, the order in the arguments is surely going to happen if the situation is not too complex.

A real order conflict would imply circular reference who is impossible.

### Dealing with non-`Diamond`-ed classes

```ts
class X extends Diamond() { ... }
class Y extends X { ... }
class Z extends X { ... }
class A extends Diamond(X, Y) { ... }
```

Well, the constructor and `super.method(...)` of `X` will be called twice.... Like if it did not extend `D()`

> :warning: It goes without saying that classes who participate in the `Diamond` game have to inherit `Diamond(...)` - even if they inherit from only one class.

For the library, a class implementing another without going through the `Diamond` process is just a block, like a single class, that cannot be separated or reorganized.

### Abstraction

`new Diamond(...)` is possible even if it still has abstract members. Yes, it can inherit abstract classes though the typings are not always possible there, and some `//@ts-ignore` might be needed.

The only problem still worked on is that if a class who has no implementation for an abstract method appears before another one who has an implementation, the method will be considered abstract (so the order of arguments for `Diamond(...)` matters here), even though a `//@ts-ignore` does the job.

> Note: [It seems impossible to solve...](https://stackoverflow.com/questions/79149281/complex-types-definition-abstract-method-filter)

### Constructor parameters

The main concern is about the fact that a class can think it extends directly another and another class can "come" in between in some legacy schemes. It is mainly concerning for constructors.

The best way to palliate is to use option objects for constructor arguments.

When a `Diamond`-ed class constructor passes an argument to `super`, this argument will be used for its descendant but also all the descendants between itself and the next `Diamond`-ed class.

```ts
class X1 { constructor(n: number) { ... } }
class D1 extends Diamond(X1) { constructor(n: number) { super(n+1); ... } }
class X2 { constructor(n: number) { ... } }
class X3 extends X2 { constructor(n: number) { super(n+2); ... } }
class D2 extends Diamond(X3, D1) { constructor(n: number) { super(n+1); ... } }

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

#### Non diamond vs diamond constructors

> Diamond' constructors do not really matter if a class is "descendant" somehow in the 2D hierarchy, only in the 1D (flat) one. It means that any constructor transforming the arguments transform it for _all_ the classes that comes afterward in the flat hierarchy. Thus, classes that are no `Diamond`ed will not modify the constructor' arguments, but only for their direct descendants. Also, if their descendants appear twice (inherited directly twice in the hierarchy), their constructors will be called twice, each time for each argument.

### Construction concern

Building another diamond in the constructor before calling `super(...)` will break the game. (Fields are initialized when `super` returns - no worries there)

# Seclusion

Another big deal of diamond inheritance is field and method conflicts.

## Easy case

You write all the classes and, when storing a `wingSpan`, you know that a plane is not a duck. You either have a plane wit a duck inside (property) or a duck that imitates a plane - but you don't confuse your `wingSpan`s.

Don't make field conflicts. Just don't.

## Yes, but it's a library I don't write

Here it is tricky, and that's where _seclusion_ comes in. Let's speak about seclusion without speaking of diamond - and, if you wish, the seclusion works without the need of involving `Diamond`. (though it is also completely integrated)

Let's say we want a `DuckCourier` to implement `Plane`, and end up with a conflict of `wingSpan` (the one of the duck and the one of the device mounted on him, the `Plane` one)

A pure and simple `class DuckCourier extends Plane` would have a field conflict. So, instead, seclusion will be used :

```ts
import { Seclude } from 'flat-diamond'

class DuckCourier extends Seclude(Plane, ['wingSpan']) { ... }
```

Et voilà, methods (as well as accessors) of `Plane` and `DuckCourier` will access two different values when accessing `this.wingSpan`

## But ... How ? And, how can I ...

When a secluded class is implemented (here, a `Plane`), the instance prototype will be replaced by `this` (so, here, a `DuckCourier`) mixed with some `Proxy` voodoo to manage who is `this` in method/accessor calls (either `DuckCourier` or `Secluded<Plane>`) - et voilà!

Because of prototyping, `Secluded<Plane>` has access to all the functionalities of `DuckCourier` (and therefore of `Plane`) while never interfering with `DuckCourier::wingSpan`. Also, having several secluded class in the legacy list will only create several "heads" who will share a prototype.

`DuckCourier` on another hand, _can_ interfere with `Plane::wingSpan` if needed thanks to the fact a `Secluded` class is also a function to retrieve the private part.

```ts
import { Seclude } from 'flat-diamond'

class Plane {
    wingSpan: number = 200
}

const MountedPlane = Seclude(Plane, ['wingSpan'])

class DuckCourier extends MountedPlane {
    wingSpan: number = 80
    get isDeviceSafe(): boolean {
        return MountedPlane(this).wingSpan > 2 * this.wingSpan
    }
}
```

> Note: `MountedPlane(this)` returns directly the instance with the good prototype for the private parts - hence, there is no need to `bind`, `.call(...)` or `.apply(...)` functions.

## Seclusion and...

### ...construction

The `Secluded<Plane>` will indeed be the object the `Plane` constructor built! If `this` was used as a reference to have globally in the constructor, it's perfect, as it will also be the object it will have as `this` in his method calls.

### ...instance methods

Yes, it's okay...

So, secluding can also be useful when some class specify different methods with the same name, so that each has its unique version (unaccessible from outside)

### ...diamonds

If `A` extends `B` who extends a `Diamond(...)`, the fields and methods of `A` and `B` only will be secluded.

# Real world

## Purpose

Typescript offer simpler (typescript-wise) but more complex (development-wise) ways to reach the same functionalities (ie. [mixins](https://www.typescriptlang.org/docs/handbook/mixins.html))

In some production environment, these solutions might be preferred.

Knowing that the whole documentation here is about rarely occurring edge cases and that [two chapters](#super) are usually enough to understand and use the library, `flat-diamond` here wish to offer:

-   A clean and working way to approach multiple inheritance - theoretically and practically
-   A tool to write a highly readable, maintainable and dynamic code. Mainly for prototyping but that can fit in most production case.
    > Some times, it's cheaper to just buy another RAM stick than to spend a week on an optimization
-   Automate bookkeeping of types - task that can be tedious in TypeScript

`flat-diamond` does not create security issues nor performance bottlenecks. It might add ~5Kb of code to load, it might add a little overtime on some function calls - but if a code does a bit more than calling NOOP billions of times, it is negligible.

## Participation

The best (even if not only) way to report a bug is to PR a failing unit test.

The best way to participate is still to [leave a note](https://github.com/emedware/flat-diamond/discussions) when the package does not meet the expectations/answer questions.
