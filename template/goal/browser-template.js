{
  let __o = IncrementalDOM.elementOpen,
      __c = IncrementalDOM.elementClose,
      __v = IncrementalDOM.elementVoid,
      __t = IncrementalDOM.text;

  {
    const style = document.createElement("style");
    style.innerHTML = `
      .margin-bottom-10 {
        margin-bottom: 10px !important;
      }

      .margin-left-10 {
        margin-left: 10px;
      }

      .cursor-pointer {
        cursor: pointer;
      }

      .todo-input {
        height: 64px;
        color: #4a4a4a;
        padding-left: 24px;
        border-top-style: hidden;
        border-right-style: hidden;
        border-left-style: hidden;
        border-bottom: 2px solid #f0f0f0;
        border-radius: 0px;
        text-shadow: none;
        box-shadow: none;
      }

      .todo-input:focus {
        outline: none;
        border-bottom: 2px solid #00d1b2;
        box-shadow: none;
      }

      .line-through {
        text-decoration: line-through;
      }
    `;
    document.head.appendChild(style);
  }

  window.bs = {
    lastObjId: 0
  };

  bs.obj = value => {
    value.$$bs = {id: bs.lastObjId++};
    return value;
  };

  bs.renderFor = (list, fn) => {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (typeof item === "undefined" || item === null) continue;
      const objectId = item.$$bs ? item.$$bs.id :
          item.toString();
      const id = "for" + objectId + "." + i + ".";
      fn(item, id);
    }
  };

  bs.whenKey = (key, fn) => {
    return function(e) {
      if (e.key === key) fn(e);
    };
  };

  bs.getValue = fn => {
    return function(e) {
      return fn(e.target.value);
    };
  };

  bs.handle = fn => {
    return function(...args) {
      const result = fn(...args);
      if (result?.type === "promise") {
        bs.thenPromise(result, () => {
          buildUi();
        });
      } else {
        buildUi();
      }
    }
  };

  bs.stop = fn => {
    return function(e) {
      e.stopPropagation();
      fn(e);
    };
  };

  // Promises =======================================================

  bs.resolvePromise = (p, value) => {
    if (p.resolved) throw new Error("Promise already resolved");
    p.value = value;
    p.resolved = true;
    processPromiseIfNeeded(p);
  }

  bs.thenPromise = (p, successFn) => {
    if (!p.successFns) {
      p.successFns = [];
    }
    p.successFns.push(successFn);
    processPromiseIfNeeded(p);
    return p;
  }

  const processPromiseIfNeeded = (p) => {
    if (p.resolved) {
      let count = 0;
      for (const fn of p.successFns) {
        count++;
        p.value = fn(p.value);
        if (p.value?.__type === "promise") {
          p.successFns = p.successFns.slice(count);
          processPromiseIfNeeded(p);
          break;
        }
      }
    };
  }

  bs.promise = (workFn) => {
    const p = {
      type: "promise"
    };
    workFn(p);
    return p;
  }

  bs.pipe = (value, ...fns) => {
    let count = 0;
    let promise = null;
    for (const fn of fns) {
      count++;
      const result = fn(value);
      if (result?.__type === "promise") {
        promise = result;
        break;
      } else {
        value = result;
      }
    }
    if (promise) {
      if (count === fns.length) return promise;
      return bs.promise($p => {
        bs.thenPromise(promise, newValue => {
          value = newValue;
          fns = fns.slice(count);
          const result2 = bs.pipe(value, ...fns);
          if (result2?.__type === "promise") {
            bs.thenPromise(result2, newValue2 => bs.resolvePromise($p, newValue2));
          } else {
            bs.resolvePromise($p, result2)
          }
        });
      });
    } else {
      return value;
    }
  }

  bs.if = (value, ...args) => {
    for (let i = 0; i < args.length; i++) {
      let conditionFn, runFn;
      if (i === args.length - 1) {
        runFn = args[i];
      } else {
        conditionFn = args[i];
        i++;
        runFn = args[i];
      }
      const shouldRun = !conditionFn ? true : conditionFn();
      if (shouldRun?.__type === "promise") {
        return bs.promise($p => {
          bs.thenPromise(shouldRun, shouldRun => {
            let result;
            if (shouldRun) {
              result = runFn(value);
            } else {
              const restArgs = args.slice(i + 1);
              result = bs.if(value, ...restArgs);
            }
            if (result?.__type === "promise") {
              bs.thenPromise(result, newValue2 => bs.resolvePromise($p, newValue2));
            } else {
              bs.resolvePromise($p, result);
            }
          });
        });
      } else {
        if (shouldRun) return runFn(value);
      }
    }
    return value;
  }

  bs.fn = (fn) => {
    return {
      $__type: "function",
      fn
    };
  };

  bs.call = (id, fn, ...args) => {
    if (fn?.$__type === "function") {
      return fn.fn("fn" + id + ".", ...args);
    } else {
      return fn(...args);
    }
  }

  var state = {
    newTodoLabel: "",
    todos: bs.obj([]),
    visibleTodos: bs.obj([]),
    displayMode: "All",
  };

  function render(state) {
    Main(state);
  }

  const rootEl = document.getElementById("root");

  function buildUi() {
    IncrementalDOM.patch(rootEl, function() {
      render(state);
    });
  }

  function Main(state, props) {
    function add() {
      return bs.pipe(null,
        () => state.todos.push(bs.obj({label: state.newTodoLabel, completed: false})),
        () => state.newTodoLabel = "",
        () => determineVisibleTodos()
      );
    }
    function setDisplayMode(mode) {
      return bs.pipe(null,
        () => state.displayMode = mode,
        () => determineVisibleTodos()
      );
    }
    function determineVisibleTodos() {
      return bs.if(null,
        () => state.displayMode === "All",
        () => state.visibleTodos = state.todos,
        () => state.displayMode === "Done",
        () => state.visibleTodos = state.todos.filter(x => x.completed),
        () => state.displayMode === "Not Finished",
        () => state.visibleTodos = state.todos.filter(x => !x.completed)
      )
    }
    const $$id = "";
    __o("div", $$id + ".1", ["class", "container"]);
      __o("div", $$id + ".2", ["class", "columns is-centered"]);
        __o("div", $$id + ".3", ["class", "column is-half has-text-centered"]);
          __o("h1", $$id + ".4", ["class", "title is-1"]);
            __t("todos");
          __c("h1");
          __v("input", $$id + ".5", ["class", "input todo-input margin-bottom-10", "oninput", bs.handle(bs.getValue(v => state.newTodoLabel = v)), "onkeyup", bs.handle(bs.whenKey("Enter", bs.getValue(add)))], "value", new String(state.newTodoLabel));
          bs.renderFor(state.visibleTodos, (todo, $$id) => {
            function toggleCompleted() {
              bs.pipe(null,
                () => todo.completed = !todo.completed,
                () => determineVisibleTodos()
              );
            }
            function remove() {
              bs.pipe(null,
                () => state.todos.splice(state.todos.indexOf(todo), 1),
                () => determineVisibleTodos()
              );
            }
            __o("div", $$id + ".6", ["onclick", e => bs.handle(toggleCompleted)(e)], "class", (todo.completed ? "is-primary " : "") + "notification margin-bottom-10 cursor-pointer has-text-left");
              __v("button", $$id + ".7", ["class", "delete", "onclick", bs.handle(bs.stop(() => remove(todo)))]);
              __o("span", $$id + ".8", [], "class", todo.completed ? "line-through" : "");
                __t(todo.label);
              __c("span");
            __c("div");
          });
          __o("div", $$id + ".9", ["class", "columns is-vcentered"]);
            __o("div", $$id + ".10", ["class", "column has-text-left"]);
              __o("b");
                __t(state.todos.filter(x => x.completed).length);
              __c("b");
              __t(" done of ");
              __o("b");
                __t(state.todos.length);
              __c("b");
            __c("div");
            __o("div", $$id + ".11", ["class", "column is-three-quarters has-text-right"]);
              const modeButton = bs.fn(($$id, label) => {
                __o("button", $$id + ".12", ["onclick", bs.handle(() => setDisplayMode(label))], "class", "button margin-left-10" + (state.displayMode === label ? " is-primary is-dark" : ""));
                  __t(label);
                __c("button");
              });
              bs.call("1", modeButton, "All");
              bs.call("2", modeButton, "Done");
              bs.call("3", modeButton, "Not Finished");
            __c("div");
          __c("div");
        __c("div");
      __c("div");
    __c("div");
  }

  buildUi();
}