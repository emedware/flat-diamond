# 1.0.11

## Fix

- Source map restoration
- prototype line consistence

# 1.0.10

## Change

- linter from prettier+eslint to biome

## Fix

-   `KeySet` now rooted on `Object.create(null)` instead of `{}` so that `'constructor' in secludedProperties` is false
-   Temporary object (modified as head with `this` diamond as proxy) now has good constructor and `instanceof`
-   Construction strategy is now a stack that is `unshift`-ed and not a map anymore. Detect construction conflict more efficiently (detect all conflict, no error on non-conflictual cases)
-   Lots of cleansing redundant code & edge-cases testing

# 1.0.9

## Change

-   `.secluded(...)` is removed as `Secluded` class becomes the function
-   `instanceOf` helper is removed as classes used in diamonds have their `hasInstance` modified and `instanceof` keyword is enough
