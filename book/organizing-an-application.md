---
type: chapter
---
# Organizing an application

The library knows nothing about your entities. A practical layout keeps the views of each entity in one file and gathers them into a plain `views` object, so every call site reads the same way.

```tree
server/
  views/
    index.ts   # the application's `views`
    user.ts    # views of the user entity
  modules/     # business logic; calls expose(...)
```

```ts
// server/views/user.ts
import { fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };

export const fields = fieldsOf<PublicUser>();
export const privateSalary = (source: { salary: number }) => ({ salary: source.salary });
```

```ts
// server/views/index.ts
import * as user from './user';

export const views = { user };
```

```ts
// at a call site
import { expose } from '@atom-forge/expose';
import { views } from '../views';

return rows.map(row => expose(row, views.user.fields('id', 'name')));
```

## Who, and what

Keep two questions apart. The module decides *who* may get the data, with its usual permission check. A view only says *what* goes out, and it cannot check anything about the caller. When a view carries sensitive data, make that visible in its name and call it only after the check:

```ts
assertCanReadSalary(viewer, row); // your own permission check
return expose(row, views.user.fields('id', 'name'), views.user.privateSalary);
```

## Keeping raw rows out

The library cannot stop code from returning a row without calling `expose`. If that matters in your project, add a test that scans the server code for the outputs you want to forbid, with an explicit allow-list for the exceptions.
