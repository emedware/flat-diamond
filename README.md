# Flat Diamond

Multiple inheritance has always has been a topic, if not a debate.

In this library, it is resolved by "flattening" the legacy.

Single inheritance works as such :

Existing inheritance: `A - B - C`.
When writing `class X extends A`, we find the inheritance `X - A - B - C`

Flattened inheritance: `X - Y - I - J` and `A - B - I - J`.
When writing `class O extends X, A`, we find the flat legacy `O - X - Y - A - B - I - J`

Flattening operation for `[ X, A ]`

```
X - Y \
       I - J
A - B /

becomes:

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

The class created by the library (`Diamond(A, B)`) will implement all the properties of all the classes appearing in the flattened legacy as accessors. It will then use the stored legacy (in the class created by the library, not yours) to retrieve the value from the good prototype.

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

Breathe and import it.

```ts
import Diamond, { instanceOf } from 'flat-diamond'
```

### But I modify my prototypes dynamically...

Cool. It's working too... Keep on rocking!

### Order conflicts

Lazily resolved by stating that the argument order of the function `Diamond(...)` is _consultative_

```ts
class X1 { ... }
class X2 { ... }
class D1 extends D(X1, X2) { ... }
class X3 { ... }
class X4 { ... }
class D2 extends D(X1, X3, D1, X4, X2)
```

Here, the flat legacy od `D2` will be `D1 - X1 - X3 - X2 - X4`. The fact that `D1` specifies it inherits from `X1` is promised to be kept, the order in the arguments is surely going to happen if the situation is not too complex.

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

`new Diamond(...)` is not possible as it is declared abstract (even if it has no abstract member) - This is so that it can inherit abstract classes!

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

#### Substitute for `this` stability

Because constructors cannot be invoked like other functions (it was simpler in older days), the objects have to be duplicated on construction.

For instance, one cannot use :

```ts
    constructor() {
        super{}
        instances.register(this);
    }
```

When constructing, the function `constructedObject` helps you retrieve the actual instance being constructed - this is the one you want to refer to.

```ts
import D, { constructedObject } from 'flat-diamond'
...
    constructor() {
        super()
        instances.register(constructedObject(this))
    }
```

> Note: There is no need to modify it directly, all the properties initialized on the temporary object are going to be transposed on it

## Participation

The best (even if not only) way to report a bug is to PR a failing unit test.

I have been really struggling with the [`HasBases` issue](#abstraction) and didn't find a way to detect in Typescript types definition if a method is abstract or not - if someone has an idea.
