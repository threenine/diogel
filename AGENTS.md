# Agents

This project uses [Junie](https://github.com/JetBrains/junie) to help with development.

You can find the project-specific guidelines for Junie in [.junie/guidelines.md](.junie/guidelines.md).

## Type discipline

- Do not introduce `any` in project code.
- Prefer exact types, type guards, discriminated unions, generics, and `unknown` plus narrowing.
- If a third-party surface is awkward, define a local type or adapter instead of falling back to `any`.
- Treat new `any` usage as a failure unless it was explicitly requested and justified.
