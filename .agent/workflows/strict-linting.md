---
description: Strict Linting & Clean Code Protocol by AI System
---
# AI System Instruction: Strict Linting & Clean Code Protocol

Context: You are generating code for a React Native / TypeScript project. You must strictly adhere to the following ESLint rules to ensure zero warnings on compilation. Do not write "lazy" code that requires manual cleanup later.

1. Unused Variables & Imports (no-unused-vars)

Rule: Never leave unused imports at the top of a file. If you remove a component or hook from the code, remove its import statement.

Rule: If a function parameter is required by the signature but not used in the body (e.g., an error in a catch block or an index in a map), you must prefix it with an underscore (e.g., catch (_error) or map((item, _index) => ...)).

Rule: Do not assign variables that are never read.

2. React Hooks Dependencies (exhaustive-deps)

Rule: You must include ALL external variables, state values, and functions used inside a useEffect, useCallback, or useMemo in the dependency array.

Rule: If including a function causes an infinite loop warning, you must wrap that parent function in a useCallback rather than leaving it out of the dependency array.

Exception: Do not leave the dependency array empty [] unless the effect truly relies on absolutely zero outside variables.

3. No Nested Components (no-unstable-nested-components)

Rule: NEVER define a React component inside the render body of another component (this frequently happens in Tab Navigators or List render items).

Fix: Always define child components at the root level of the file or in a separate file, and pass data down via props.

4. Strict Type & Number Casting

Rule (radix): Whenever you use parseInt(), you must include the radix (base) parameter. Always write parseInt(value, 10). Never write parseInt(value).

Rule (no-undef-init): Never explicitly initialize a variable to undefined. Write let colors: string[]; instead of let colors: string[] | undefined = undefined;.

Rule (no-extra-boolean-cast): Avoid redundant double negations. Do not use !! if the value is already being evaluated in a boolean context (like an if statement).

5. Regex and Escaping (no-useless-escape)

Rule: Do not escape characters in strings or Regular Expressions unless strictly necessary for the compiler. Avoid \[ or \/ inside character classes where they don't hold special meaning.

6. Strict TypeScript (The "No any" Rule)

Rule: Never use the any type. If a type is complex, define a strict interface or type alias.

Rule: Always explicitly type your function return values and React component props (e.g., const MyComponent: React.FC<Props> = ...). Do not rely entirely on implicit inference for public module exports.

7. React List Rendering (key Anti-pattern)

Rule: When rendering lists using .map() or a FlatList, never use the array index as the key prop unless the list is completely static and will never be reordered or filtered.

Fix: Always use a unique identifier (like song.id or playlist.id). Using index as a key in a draggable or dynamic list will break the UI state.

8. Memory Leaks & Cleanup (Audio/Listeners)

Rule: If a useEffect attaches an event listener, sets a setInterval, or mounts an Audio.Sound instance, you must return a cleanup function to remove it when the component unmounts.

Fix: Always write return () => { ...cleanup logic... } to prevent "State update on unmounted component" errors and out-of-memory crashes.

9. UI Performance (No Inline Styles)

Rule: Do not write inline styles style={{ flexDirection: 'row', margin: 10 }} inside the render method. This forces React to create a new style object on every single frame, killing 60fps animations.

Fix: Always use StyleSheet.create({}) at the bottom of the file and reference style={styles.container}.
