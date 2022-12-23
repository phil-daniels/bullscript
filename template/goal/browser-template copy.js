{
  const __t = IncrementalDOM.text;

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

  const bs = {
    lastObjId: 0,
    initialRender: true,
    pendingInternalObjs: [],
    openTagTypes: [],
    parentLocationPathIds: null,
    parentLocationPathId: null,
    components: [],
    state: {__files: {}},
  };
  window.bs = bs;
  
  bs.initParentLocation = () => {
    bs.parentLocationPathIds = [""]
    bs.parentLocationPathId = "";
  };

  bs.bsContainerMixins = {
    isBsContainer: function() {
      return true;
    },
    getInternalObj() {
      let internalObj = this.get("__bs");
      if (!internalObj) {
        internalObj = {};
        this.set("__bs", internalObj);
      }
      return internalObj;
    },
    initContainer() {
      this.set("__bs", {
        objId: bs.lastObjId++,
      });
      for (const [key, childValue] of this) {
        if (!bs.isBsContainer(childValue) && !key.startsWith("__")) {
          const childContainer = Array.isArray(childValue) ? bs.list(childValue) : bs.obj(childValue);
          this.set(key, childContainer);
          childContainer.get("__bs").set("parent", value);
        }
      }
    }
  };

  bs.BsObject = class BsObject extends Map {
    constructor(obj) {
      super();
      for (const [key, value] of Object.entries(obj)) {
        this.set(key, value);
      }
    }
  }

  Object.assign(bs.BsObject.prototype, bs.bsContainerMixins);

  bs.BsList = class BsList {
    constructor(arr) {
      this.arr = arr;
    }

    get(key) {
      return this.arr[key];
    }

    set(key, value) {
      this.arr[key] = value;
    }
  }

  Object.assign(bs.BsList.prototype, bs.bsContainerMixins);

  bs.list = list => {
    return new bs.BsList(list);
  };

  bs.obj = obj => {
    return new bs.BsObject(obj);
  };

  bs.isBsContainer = value => {
    return value?.isBsContainer?.();
  };

  bs.set = (stateObj, key, value) => {
    stateObj.set(key, value);
    bs.setPending(stateObj);
  };

  bs.push = (arr, item) => {
    arr.push(item);
    bs.setPending(arr);
    bs.addAction(arr, {actionType: "push", value: item});
  };

  bs.addAction = (listObj, action) => {
    if (!listObj.__bs.actions) {
      listObj.__bs.actions = [];
    }
    listObj.__bs.actions.push(action);
  };

  bs.setPending = stateObj => {
    stateObj.__bs.pending = true;
    bs.pendingInternalObjs.push(stateObj.__bs);
    if (stateObj.__bs.parent) {
      bs.setPending(stateObj.__bs.parent);
    }
  };

  bs.renderFor = (loopLocationId, props, list, itemName, fn) => {
    if (!list) return;
    const loopId = "__for_" + loopLocationId;
    let forState = props[loopId];
    if (!forState) {
      forState = {
        lastDiffId: 0, // diff id differentiates multiple references to the same obj in a list
        diffIds: [...Array(list.length).keys()], // initialize w/ index
        loopStates: [],
      };
      props[loopId] = forState;
    }
    const loopStates = forState.loopStates;
    const diffIds = forState.diffIds;
    if (list.__bs.actions?.length > 0) {
      for (const action of list.__bs.actions) {
        if (action.actionType === "remove") {
          const index = forState.indexOf(action.index);
          loopStates.splice(index);
          diffIds.splice(index);
        } else if (action.actionType === "push") {
          loopStates.push({});
          diffIds.push(forState.lastDiffId++);
        } else if (action.actionType === "insert") {
          throw new Error("implement me!");
        } else {
          throw new Error("unhandled action type");
        }
      }
    }
    bs.withParentLocationPathId(loopLocationId, () => {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (typeof item === "undefined" || item === null) continue;
        const diffId = diffIds[i];
        const loopState = loopStates[i];
        loopState[itemName] = item;
        const objectId = item?.__bs.objId || item.toString();
        bs.withParentLocationPathId(objectId + "/" + diffId, () => {
          fn(loopState);
        });
      }
    });
  };

  bs.component = (buildFn, deps = []) => {
    return function(locationId, state, ...args) {
      const componentStateKey = "__component_" + locationId;
      let componentState = state[componentStateKey];
      let shouldRun = false;
      const values = args.map(arg => {
        const isProp = !!arg?.__type === "property";
        return isProp ? arg.value : arg;
      });
      if (!componentState) { // component has not been rendered before
        shouldRun = true;
        componentState = {};
        state[componentStateKey] = componentState;
      } else {
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          if (arg?.__bs?.pending) {
            shouldRun = true;
            break;
          } else {
            const value = values[i];
            const prevValue = componentState.__prevValues[i];
            if (value !== prevValue) {
              shouldRun = true;
              break;
            }
          }
        }
        if (!shouldRun) {
          // check file dependencies
          shouldRun = deps.some(x => bs.files[x]?.pending);
        }
      }
      if (shouldRun) {
        componentState.props = args.map(arg => {
          const isProp = !!arg?.__type === "property";
          if (!isProp) {
            return bs.prop(null, arg);
          } else {
            return arg;
          }
        });
        componentState.__prevValues = values;
        for (const arg of args) {
          componentState[arg.key] = arg.value;
        }
        bs.withParentLocationPathId(componentStateKey, () => {
          componentState.__rootComponentCount = buildFn(componentState);
        });
      } else {
        IncrementalDOM.skipNode(componentState.__rootComponentCount);
      }
      // const externalArgs = [];
      // for (const arg of args) {
      //   const type = typeof arg;
      //   let key, value;
      //   if (type === "string") {
      //     if (arg.startsWith("__")) continue;
      //     value = arg;
      //   } else if (type === "object") {
          
      //   }
      // }).map(arg => {
        

      //   const value = state[key];
      //   if (arg?.__type === "property") {
      //     return arg;
      //   } else {
      //     return {__type: "property", key: null, value};
      //   }
      // });
      // // check to see if args changed
      // let shouldRun = args.some(({key, value}) => {
      //   // look at the value or the parent obj (if it's a primitive) to check for change
      //   const bsObj = (value?.__bs ? value : state).__bs;
      //   return bsObj.pending || bsObj.unrendered;
      // });
      // if (!shouldRun) {
      //   // check file dependencies
      //   shouldRun = deps.some(x => state.__files[x]?.pending);
      // }
      // const componentStateKey = "__component_" + locationId;
      // let componentState = state[componentStateKey];
      // if (shouldRun || !componentState?.__rootComponentCount) {
        // if (!componentState) {
        //   componentState = {};
        //   state[componentStateKey] = componentState;
        // }
      //   componentState.__props = args;
      //   for (const arg of args) {
      //     componentState[arg.key] = arg.value;
      //   }
      //   bs.withParentLocationPathId(componentStateKey, () => {
      //     componentState.__rootComponentCount = fn(componentState);
      //   });
      // } else {
      //   IncrementalDOM.skipNode(componentState.__rootComponentCount);
      // }
    };
  };

  bs.whenKey = (key, fn) => {
    return function(e) {
      if (e.key === key) bs.call(fn, e);
    };
  };

  bs.getValue = (fn) => {
    return function(e) {
      return bs.call(fn, e.target.value);
    };
  };

  bs.handle = fn => {
    return function(...args) {
      const result = bs.call(fn, ...args);
      if (result?.__type === "promise") {
        bs.thenPromise(result, () => {
          render();
        });
      } else {
        render();
      }
    }
  };

  bs.stop = fn => {
    return function(e) {
      e.stopPropagation();
      fn(e);
    };
  };

  bs.getState = function(state, propName, setter, initializerFn) {
    if (!state.__initializedStateProps) {
      state.__initializedStateProps = new Set();
    }
    let value;
    if (state.__initializedStateProps.has(propName)) {
      value = state[propName];
    } else {
      value = initializerFn();
      state[propName] = value;
    }
    setter(value);
    return {
      assign: function() {
        throw new Error("implement me!");
      }
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
      fn: (...args) => {
        fn(...args);
      }
    };
  };

  bs.withParentLocationPathId = (locationId, fn) => {
    const ids = bs.parentLocationPathIds;
    bs.parentLocationPathId += "." + locationId;
    ids.push(bs.parentLocationPathId);
    const result = fn();
    ids.pop();
    bs.parentLocationPathId = ids.pop(ids.length - 1);
    return result;
  };

  bs.call = (fn, ...args) => {
    if (fn?.$__type === "function") {
      return fn.fn(...args);
    } else {
      // calling fn outside of bullscript
      // TODO what should we to to exported/imported objs?
      return fn(...args);
    }
  }

  Object.defineProperty(bs, 'c', {
    get: function() {
      const type = bs.openTagTypes.shift();
      IncrementalDOM.elementClose(type);
      const ids = bs.parentLocationPathIds;
      ids.pop();
      bs.parentLocationPathId = ids[ids.length - 1];
    }
  });

  let __o, __v;
  {
    __o = function(type, locationId, staticProps, ...props) {
      if (!props) props = [];
      bs.parentLocationPathId += "." + locationId;
      bs.parentLocationPathIds.push(bs.parentLocationPathId);
      props.push("id"); props.push(bs.parentLocationPathId); // TODO remove, debugging only!
      IncrementalDOM.elementOpen(type, bs.parentLocationPathId, staticProps, ...props);
      bs.openTagTypes.push(type);
    };
    __v = function(type, locationId, staticProps, ...props) {
      if (!props) props = [];
      const locationPathId = bs.parentLocationPathId + "." + locationId;
      props.push("id"); props.push(locationPathId); // TODO remove, debugging only!
      IncrementalDOM.elementVoid(type, locationPathId, staticProps, ...props);
    };
  }

  bs.rootEl = document.getElementById("root");

  function render() {
    bs.initParentLocation();
    IncrementalDOM.patch(bs.rootEl, function() {
      bs.components.Main(20, bs.state);
    });
    // erase pending flags
    for (const obj of bs.pendingInternalObjs) {
      delete obj.pending;
    }
  }

  bs.components.Main = bs.component(__state => {
    let newTodoLabel, todos, visibleTodos, displayMode, add, setDisplayMode, determineVisibleTodos, remove;
    let __c = 0;
    const __state_newTodoLabel = bs.getState(__state, "newTodoLabel", __ => newTodoLabel = __, () => "");
    const __state_todos = bs.getState(__state, "todos", __ => todos = __, () => bs.list([]));
    const __state_visibleTodos = bs.getState(__state, "visibleTodos", __ => visibleTodos = __, () => bs.list([]));
    const __state_displayMode = bs.getState(__state, "displayMode", __ => displayMode = __, () => "All");
    const __state_add = bs.getState(__state, "add", __ => add = __, () => bs.fn(() => {
      return bs.pipe(null,
        () => bs.push(__state.todos, bs.createState({label: __state.newTodoLabel, completed: false})),
        () => __state_newTodoLabel.assign(""),
        () => bs.call(22, __state.determineVisibleTodos)
      );
    }));
    const __state_setDisplayMode = bs.getState(__state, "setDisplayMode", __ => setDisplayMode = __, () => bs.fn(mode => {
      return bs.pipe(null,
        () => __state_displayMode.assign(mode),
        () => bs.call(21, __state.determineVisibleTodos)
      );
    }));
    const __state_determineVisibleTodos = bs.getState(__state, "determineVisibleTodos", __ => determineVisibleTodos = __, () => bs.fn(() => {
      return bs.if(null,
        () => __state.displayMode === "All",
        () => __state_visibleTodos.assign(__state.todos),
        () => __state.displayMode === "Done",
        () => __state_visibleTodos.assign(__state.todos.filter(x => x.completed)),
        () => __state.displayMode === "Not Finished",
        () => __state_visibleTodos.assign(__state.todos.filter(x => !x.completed))
      )
    }));
    const __state_remove = bs.getState(__state, "remove", __ => remove = __, () => bs.fn(() => {
      bs.pipe(null,
        () => __state.todos.splice(__state.todos.indexOf(__state.todo), 1),
        () => bs.call(23, determineVisibleTodos)
      );
    }));
    __c++;
    __o("div", 1, ["class", "container"]);
      __o("div", 2, ["class", "columns is-centered"]);
        __o("div", 3, ["class", "column is-half has-text-centered"]);
          __o("h1", 4, ["class", "title is-1"]);
            __t("todos");
          bs.c;
          __v("input", 5, ["class", "input todo-input margin-bottom-10", "oninput", bs.handle(bs.getValue(v => bs.set(__state, "newTodoLabel", v))), "onkeyup", bs.handle(bs.whenKey("Enter", bs.getValue(__state.add)))], "value", new String(__state.newTodoLabel));
          bs.renderFor(6, __state, __state.visibleTodos, "todo", null /*no loop state builder fn, default to {}*/, (__state) => {
            bs.components.Todo(19, bs.get(__state, "todo"), bs.get(__state, "determineVisibleTodos"), bs.get(__state, "remove"));
          });
          __o("div", 7, ["class", "columns is-vcentered"]);
            __o("div", 8, ["class", "column has-text-left"]);
              __o("b", 9, []);
                __t(__state.todos.filter(x => x.completed).length);
              bs.c;
              __t(" done of ");
              __o("b", 10);
                __t(__state.todos.length);
              bs.c;
            bs.c;
            // __state.modeButton(27, __state, "All", bs.prop("allCaps", true));
            // {allCaps: true, __state: [{value: "All"}, {key: "allCaps", value: true}]}
            // bs.component(({allCaps, __state}) => {
            //   const ____state = arguments[0]
            __o("div", 11, ["class", "column is-three-quarters has-text-right"]);
              __state.modeButton = bs.component((__state) => {
                __o("button", 12, ["onclick", bs.handle(() => setDisplayMode(label))], "class", "button margin-left-10" + (__state.displayMode === label ? " is-primary is-dark" : ""));
                  __t((__state.allCaps ? label.toUpperCase() : label));
                bs.c;
              });
              __state.modeButton(27, __state, bs.get(__state, "All"), bs.prop("allCaps", true));
              __state.modeButton(28, __state, bs.get(__state, "Done"));
              __state.modeButton(29, __state, bs.get(__state, "Not Finished"));
            bs.c;
          bs.c;
        bs.c;
      bs.c;
    bs.c;
    return __c;
  });

  bs.state.__files["other-data.bs"] = bs.createState({
    moreStuff: 0
  });

  bs.components.Todo = bs.component(__state => {
    let __c = 0;
    const __state_toggleCompleted = bs.getState(__state, "toggleCompleted", __ => toggleCompleted = __, () => bs.fn(function toggleCompleted() {
      bs.pipe(null,
        () => __state.todo.completed = !__state.todo.completed,
        () => __state.determineVisibleTodos()
      );
    }));
    __c++;
    __o("div", 16, ["onclick", e => bs.handle(__state.toggleCompleted)(e)], "class", (__state.todo.completed ? "is-primary " : "") + "notification margin-bottom-10 cursor-pointer has-text-left");
      __v("button", 17, ["class", "delete", "onclick", bs.handle(bs.stop(() => bs.call(24, __state.remove, __state.todo)))]);
      __o("span", 18, [], "class", __state.todo.completed ? "line-through" : "");
        __t(__state.todo.label);
      bs.c;
    bs.c;
    __c++;
    __o("b");
      __t("Wha?!");
    bs.c;
    return __c;
  }, [
    "other-data.bs"
  ]);

  render();
  bs.initialRender = false;
}