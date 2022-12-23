[Bullscript.io](http://bullscript.io)

# Bullscript

Bullscript is a language for the web. It allows you to create a SPA front-end, a back-end and a database all in one project.

# Early Development Stage

Currently in the early development stages. Not ready for use, but available for those interested.

# Examples

## Hello world

Compiling will produce "dist/app.js". If you run `node dist/app.js` a web server will run and serve an HTML page that says "Hello world".

### main.bs

```
# component

"Hello world"
```

## React-like rendering

Anytime state changes, code to render the UI is re-run, but state is left intact.

Differences to React include:
- Mutable state supported
- Will automatically skip rendering components if state has not changed
- Ids don't need to be set on tags inside of for loops
- Ids only need to be set on while loops if there is state declared inside

### main.bs

```
# component

state count = 0

:h1 "Counter"
:div "Count {count}"
:button "Increment", -> count += 1
```

## Database integration

IN DEVELOPMENT!

Database - Databases and tables can be declared with the "use" keyword (only in the main.bs file) and can be used throughout the project. Each table is given an implicit id field.

Now and later - Since async operations (like database interaction) can't be done on render, so now and later can be used to specify an initializer now (on render) and later (just after render).

Component refresh - component.refresh() reinitializes all state within the component and re-renders.

### main.bs

```
# component

use database
   Table Todo
      label String {maxLength: 50}
      completed Boolean

state todos = now [] later select Todo // selects from table Todo
state newTodoLabel = ""

fn delete(todo) ->
   delete todo // deletes from table Todo based on todo.id
   component.refresh()

fn markCompleted(todo) ->
   update todo {completed: true} // updates table Todo base on todo.id
   component.refresh()

fn create() ->
   insert Todo {label: newTodoLabel, completed: false}
   newTodoLabel = ""
   component.refresh()

:input newTodoLabel, _ -> newTodoLabel = _, onKeyUp[Enter]: -> create()
for (todo in todos)
   :div todo.label
   :button "X", -> delete(todo)
```

# Tools

- [VSCode extension](https://github.com/phil-daniels/vscode-bullscript) for syntax highlighting