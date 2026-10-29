## Guidelines

- use and update CONTEXT.md to build a mental map of the project and it's domain language
- git: branch per change, conventional commits, no HTML in Git messages
- planing: decompose complex tasks into dependency graph and vertical slices, store plan in docs/internal/plans/<PLAN_ID>_<FEATURE_NAME>.md, plan contains frontmatter metadata to track state of implementation
- code: use tech stack docs to following best practices, continuous refactoring during implementation where it makes sense to improve code quality, while working on a feature; update corresponding plan to track progress in docs/internal/plans/<PLAN_ID>_<FEATURE_NAME>.md
- docs: clean and concise wording, mermaid diagrams, progressive discolsure, after finishing a feature, set state in the feature's plan to DONE

## Tech Stack

- bun (fullstack toolkit) - https://bun.com/docs/bundler/fullstack
- nsh (UI framework) - https://nsh.dev/docs/
