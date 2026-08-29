OpenCode AGENTS Guidelines
This document describes how agents should operate inside this repository. It covers build/lint/test commands, how to run a single test, and code‑style guidance across common languages. It also notes how to respect any Cursor or Copilot rules present in the repo.

Cursor and Copilot Rules
- If a Cursor policy exists at .cursor/rules/ or .cursorrules, follow it.
- If Copilot guidance exists at .github/copilot-instructions.md, follow it as applicable to automation tasks.
- If those files are missing, rely on the general guidelines below.

Root conventions
- This repo may contain multiple ecosystems (Node/TS, Python, Go, Rust, Java, etc.). Look for language manifests (package.json, pyproject.toml, requirements.txt, go.mod, Cargo.toml, pom.xml, build.gradle, etc.) to decide the primary toolchain for a given area.
- Do not run destructive commands. Prefer non-destructive actions and provide explanations for any risky steps.

Build, Lint, and Test commands
- The following are the common entry points. Use the one that matches the detected language/tooling.
- Running all tests: use the language’s standard test command (see sections below).
- Running a single test: use the language’s test selector (see examples).
- If a project defines scripts (e.g., npm scripts, Makefile, or other wrappers), prefer using those to ensure consistency with CI.

Node.js / TypeScript / JavaScript
- Build: npm run build
- Lint: npm run lint
- Test: npm test
- Run a single test (Jest/Vitest): npm test -- -t "TestName"
- Examples:
  - Build entire project: `npm run build` (or `yarn build` / `pnpm build` if you use those)
  - Run unit tests: `npm test`  and filter: `npm test -- -t "MyComponent renders"`

Python
- Build (packaging): python -m build
- Lint: flake8 .
- Test: pytest -q
- Run a single test: `pytest path/to/test_file.py::TestClass::test_method -q`
- Formatting/typing: optionally use `black` and `mypy` if the project enables them.

Go
- Build: go build ./...
- Lint: golangci-lint run
- Test: go test ./...
- Run a single test: `go test -run TestName ./...`

Rust
- Build: cargo build
- Lint: cargo clippy --all-targets --all-features -- -D warnings
- Test: cargo test
- Run a single test: `cargo test TestName`

Java (Maven / Gradle)
- Build: mvn -q -DskipTests package  OR  ./gradlew build
- Lint/Quality: mvn checkstyle:check  OR  ./gradlew check
- Test: mvn test  OR  ./gradlew test
- Run a single test: `mvn -Dtest=TestName test`  OR  `./gradlew test --tests TestName`

General tips for running a single test across ecosystems
- Identify the test name (and class/module) from the file structure.
- Use a focused selector (name or pattern) to avoid long test runs.
- When in doubt, run a verbose test to locate the correct symbol name, then re-run with the filter.

Code style and conventions
- The following rules aim to keep the codebase readable and maintainable across languages. Adapt as needed for language idioms.

Imports / module imports
- Node/TS: group imports as standard library, third-party, then local; sort within groups; avoid side-effect imports unless intentional.
- Python: use isort to group imports (stdlib, third-party, local); sort alphabetically within groups.
- Go: keep standard library first, then third-party, then project code; use `go fmt` for formatting.
- Rust: alphabetize and group use statements; rely on rustfmt.
- Java: organize imports with standard/third-party/local grouping; remove unused imports.

Formatting and tooling
- Prefer language idiomatic formatters: Prettier/ESLint for JS, Black/Isort for Python, Go fmt, Rustfmt, Clippy, etc.
- Run formatters as part of a pre-commit or CI check; ensure code is consistently formatted.
- Do not mix formatting styles across files; align with project rules.

Types, data modeling, and APIs
- TypeScript/JavaScript: prefer explicit types where useful; use interfaces for public shapes; prefer unions and discriminated unions where helpful.
- Python: use typing module for complex APIs; annotate public functions and return types; avoid using Any when possible.
- Go: model APIs with concrete types; minimize interface{}; document exported types and methods.
- Rust: prefer strong typing; use enums and existing crates for API surfaces; document public items.
- Java: follow the language’s generics and null-safety patterns; document public APIs with Javadoc.

Naming conventions
- Align with language defaults unless the project specifies a style guide.
- JS/TS: camelCase for variables/functions; PascalCase for types; constants in UPPER_SNAKE.
- Python: snake_case for functions/vars, PascalCase for classes; constants ALL_CAPS.
- Go: mixedCaps for names; acronyms consistent; exported names start with uppercase.
- Rust: snake_case for functions/vars; UpperCamel for types; modules in kebab-case.
- Java: camelCase for methods/vars; PascalCase for classes; constants in ALL_CAPS.

Error handling and resilience
- Propagate errors with context; avoid swallowing details.
- Go: wrap errors with %w or errors.Is; provide context on failures.
- Python: raise informative exceptions; preserve tracebacks; consider custom error types.
- JS/TS: catch and rethrow with meaningful messages; avoid swallowing promises without rejection handlers.
- Rust: use Result<T, E>; propagate with ?; provide descriptive error variants.

Documentation and comments
- Public APIs should have doc comments in the language's standard format (JSDoc, Python docstrings, Go doc, Rust docs, JavaDocs).
- Explain non-obvious decisions; document tricky edge cases.
- Keep comments up to date with code changes.

Testing culture
- Tests should be deterministic, fast, and isolated.
- Name tests clearly to reflect behavior and boundaries.
- Cover happy paths and critical error paths; avoid flaky tests.
- Prefer fixtures that are easy to reason about; clean up state after tests.

Security, privacy, and secrets
- Never commit secrets or credentials; use environment variables or secret managers.
- Validate and sanitize user input; avoid leaking sensitive data in error messages.
- Regularly audit dependencies for vulnerabilities; pin lockfiles when appropriate.

CI, dependencies, and releases
- Use lockfiles (package-lock.json, yarn.lock, Pipfile.lock, go.sum, Cargo.lock, etc.).
- Ensure tests pass on CI; reproduce CI steps locally when possible.
- Include a changelog entry in PRs for user-visible changes.

Git and PR hygiene
- Use conventional commits: feat:, fix:, docs:, chore:, refactor:, test:
- Provide a short rationale in the commit subject; avoid duplicating code changes.
- Do not amend commits if they have been pushed to remote unless user explicitly requests it.
- Run tests before committing; ensure no secrets are committed.

Next steps
- If you’d like, I can scaffold an AGENTS.md tailored to this repo after you point me to the primary languages and tooling in use.
- I can also generate per-language example scripts for common tasks and add sample commit messages.
