# 1.0.10

## Bug-fix

- `KeySet` now rooted on `Object.create(null)` instead of `{}` so that `'constructor' in secludedProperties` is false
- Temporary object (modified as head with `this` diamond as proxy) now has good constructor and `instanceof`

# 1.0.9

## Change

- `.secluded(...)` is removed as `Secluded` class becomes the function
- `instanceOf` helper is removed as classes used in diamonds have their `hasInstance` modified and `instanceof` keyword is enough