# AI Agent Rules

Instructions for AI coding assistants working on this codebase.

Integreat is an integration layer written in TypeScript. It is given a
configuration of services, schemas, and the mapping (mutations) between them. It
also supports jobs/flows and authenticators. The core concept is build on
dispatching actions, that are first passed through a middleware, before being
routed to a handler based on the given action type.

# Preferred agent behavior

- IMPORTANT: Read what kind of conversation we're in before acting. Two modes:
  - **Directive** — I've handed you a task ("please fix this", "add X", "rename
    Y"). Here, go ahead and do it; a hunch I include ("...my hunch is it's the
    cache") is help, not a gate.
  - **Discussion** — we're figuring something out together ("what do you think
    about this?", "should we...?", "I'm wondering if..."). Here your job is to
    investigate, explain, and propose so we can reach a conclusion together. Do
    NOT start implementing mid-discussion — that breaks the back-and-forth
    before we've actually decided.
- In a discussion, my replies (including hunches and opinions) are turns in the
  conversation, not approval. Implement only once we've landed on a conclusion
  together, or once the discussion clearly turns into a directive ("ok, do it").
- When you can't tell which mode we're in, assume discussion: answer, propose,
  and wait.
- Keep your answers short when you can. Elaborate answers on topics I didn't ask
  about does not help. Instead mention your objections without diving fully into
  it.
- Don't do more than the user ask you to do. If the user ask you a question,
  answer it and then STOP.
- Don't implement fixes, make changes, or address other issues you notice unless
  explicitly asked. Even if you find problems while investigating, only mention
  them if directly relevant to the question.
- When a plan is approved, that's a signal for you to start implementing. Don't
  ask if for permission to start implementing an approved plan. :)
- If you run into unexpected issues while implementing a plan, so that you have,
  to reconsider parts of the plan – stop and ask for input. Don't make any big
  decitions to change the plan without consulting the user.

# Approach and philosophy

- Maintain separation of concerns between components.
- Prefer functional style programming over classes, unless there's a specific
  reason for using a class.
- Never create local `.md` files for setup guides, API documentation, or usage
  examples. Keep setup instructions, function usage, and implementation details
  as comments above the relevant code.
- After writing or editing any file, run `npx prettier --write` on it.
- Update `README.md`, when you implement something that directly affect
  functionality at the user-facing level.
- When using an external package, try first to use the features of that package,
  before implementing custom workarounds.
- When you can't use file editing tool in the repo, don't compensate by
  outputting code the chat. Instead describe your approach at a higher level and
  ask if you should implement it.

# TypeScript rules

- Check for TypeScript and lint errors
- Important: You should NEVER use `any` to fix type issues!
- Whenever you use inline typing with `as` you should reconsider if there are
  better ways of doing this.
- You should avoid doing local type overrides as far as possible.
- Avoid inline types like `{ foo: string }` - instead reuse existing types from
  the codebase.
- Prefer using generic type parameters over type assertions - for example,
  `createMockGraphQLRequestClient<MutationArgs>(...)` instead of
  `(variables as MutationArgs)`.
- When importing types, use `import type` and place directive below other import
  directives.
- When a file has a main function, use default export. When a file have several
  functions, without any of them being the main one, use named exports. Also use
  named exports for "support function" when there's a main function.
- Don't use `await import` (dyanamic imports) unless there's a real need for it.

# Node.js rules

- Prefer built-in Node.js functionality over installing packages.
- Prefer packages from @sindresorhus over equal alternatives from others.
- Prefer the latest version of packages, and check that packages are not
  deprecated by doing a web search.

# Testing rules

- Write tests in the built in node test runner.
- Import assertions from `node:assert/strict` so you don't have to specify
  "strict" on every assertion.
- Write test names starting with "should", e.g. "should return the first item"
- For test files that need a mock database or some common setup, wrap all tests
  in a `describe` block with a common setup using `beforeEach` and `afterEach`.
- Each test should consist of three steps in this exact order:
  1. **Setup** - Set up any necessary preconditions and define expected values
  2. **Execution** - Call the function or code being tested
  3. **Assertions** - Verify the results match expectations
- Separate these three groups with blank lines. Don't use blank lines within a
  group.
- In the setup section, define an `expected` variable when the test involves
  comparing a result to an expected value. If there are more expected values,
  name them with the `expected` prefix. Keep the expected variables below the
  other setup code. This makes the test's purpose clearer.
- When the expected result is fully deterministic, use `assert.deepEqual` to
  compare the entire response — this catches unexpected changes in any field.
  When the result contains dynamic values (`id`, `createdAt`, timestamps), use
  field-level assertions (`assert.equal`, `assert.ok`) on the known fields.
- Use `sinon` for mocking.
- Chaining methods in test setup, like
  `sinon.stub().returns(...).onFirstCall().returns(...)`, as oposed to starting
  each line with the mock variable.
- Keep unit tests with the file that's being tested.
- When I ask you to update tests, do it without updating the implementation. I
  want to see the tests failing before I ask you to update the implementation.
