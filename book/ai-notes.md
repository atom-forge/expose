# AI Notes

A coding agent works best when it reads the documentation of the package first and knows the decisions your project has already made. Copy the fenced block below into the instruction file of your project (for example `AGENTS.md`) and replace every `<...>` field with a fact you have verified in your application.

## Copyable instructions

```markdown
## AtomForge Expose

Before using `@atom-forge/expose`, start with
`node_modules/@atom-forge/expose/README-AI.md` at the package root, then follow
its documentation pointers. Use documentation matching the installed version.
This is a filesystem Markdown path, not a package import subpath.

- Data goes to the client only through `expose(row, views.<entity>.<view>)`.
- Views live in `<the folder of the project's views>`, per entity.
- Copy plain fields with `fieldsOf`; write a view by hand for computed fields and nested data.
- A view names every field it returns: never spread `source`, and never return a nested row as it is.
- Check who may get the data before the call: `<where the project's permission checks live>`.
- Raw rows are kept out by `<the project's guard test, or "code review">`.
```
