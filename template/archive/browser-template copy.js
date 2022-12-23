(bs => {

// Object/Properties ===============================

let lastObjId = 0;

bs.state = (name, setter, initialValue) => {
  const stateObj = React.useRef(new bs.State(name, setter)).current;
  stateObj.reactSetter = React.useState(() => { stateObj.init(initialValue) ; return stateObj.$immObj })[1];
  setter(stateObj.ref);
  return stateObj;
}

bs.getUserEntries = (obj) => {
  return Object.entries(obj).filter(x => !x[0].startsWith("$"));
}

bs.getUserProperties = (obj) => {
  const newObj = {};
  for (const [key, value] of bs.getUserEntries(obj)) {
    newObj[key] = value;
  }
  return newObj;
}

bs.State = class State {
  constructor(prop, setter) {
    this.prop = prop;
    this.setter = setter;
    this.$listeners = [];
    this.$triggerUpdate = this.$triggerUpdate.bind(this);
    this.$triggerUpdate.state = this;
    this.assign = this.assign.bind(this);
  }

  get $immObj() {
    return bs.isPrimitive(this.ref) ? this.ref : this.ref.$immObj;
  }

  $get(prop) {
    return this.ref[prop];
  }

  $set(prop, value) {
    return this.ref[prop] = value;
  }

  init(obj) {
    this.ref = obj;
    if (!bs.isPrimitive(obj)) obj.$addListener(this);
    return obj;
  }

  assign(obj) {
    if (obj !== this.ref) {
      if (this.ref && !bs.isPrimitive(this.ref)) {
        this.ref.$removeListener(this);
      }
      this.init(obj);
      this.$triggerUpdate();
    }
  }

  $triggerUpdate() {
    this.reactSetter(bs.isPrimitive(this.ref) ? this.ref : this.ref.$immObj);
  }
}

const ObjectMixin = {

  $addListener(listeningObj) {
    this.$listeners.push(listeningObj.$triggerUpdate);
  },

  $removeListener(listeningObj) {
    this.$listeners.splice(this.$listeners.indexOf(listeningObj.$triggerUpdate), 1);
    if (this.$listeners.length === 0) {
      for (const [key, value] of bs.getUserEntries(this)) {
        if (!bs.isPrimitive(value)) {
          value.$removeListener(this);
        }
      }
    }
  },

  $get(prop) {
    return this[prop];
  },

  $set(prop, value) {
    const prevObj = this[prop];
    if (prevObj !== value) {
      if (prevObj && !bs.isPrimitive(prevObj)) {
        prevObj.$removeListener(this);
      }
      this[prop] = value;
      this.$updateImm();
      if (!bs.isPrimitive(value)) {
        value.$addListener(this);
      }
      this.$triggerUpdate();
      return value;
    } else {
      return prevObj;
    }
  },

  $triggerUpdate() {
    this.$listeners?.forEach(x => x());
  },

  $init(obj) {
    this.$id = lastObjId++;
    this.$triggerUpdate = this.$triggerUpdate.bind(this);
    this.$triggerUpdate.obj = obj;
    this.$listeners = [];
    Object.assign(this, obj);
    for (const [key, value] of bs.getUserEntries(this)) {
      if (!bs.isPrimitive(value)) {
        value.$addListener(this);
      }
    }
    this.$updateImm();
  },

  $updateImm() {
    this.$immObj = Object.assign(this.$createBaseObj(), bs.getUserProperties(this));
  }
}

bs.BsObject = class BsObject {
  constructor(obj) {
    this.$init(obj);
  }

  $createBaseObj() {
    return {};
  }
}

bs.BsArray = class BsArray extends Array {
  constructor(arr) {
    super();
    this.$init(arr);
    this.add = this.add.bind(this);
    this.remove = this.remove.bind(this);
    this.removeIndex = this.removeIndex.bind(this);
  }

  $createBaseObj() {
    return [];
  }

  add(item) {
    if (!Array.isArray(this)) throw new Error("Cannot push item to non-array");
    this.push(item);
    if (this.$immObj) {
      if (!bs.isPrimitive(item)) {
        item.$addListener(this);
      }
      this.$immObj = [...this.$immObj, item];
      this.$triggerUpdate();
    }
  }

  remove(item) {
    if (!Array.isArray(this)) throw new Error("Cannot remove item from non-array");
    this.removeIndex(this.indexOf(item));
  }

  removeIndex(index) {
    if (!Array.isArray(this)) throw new Error("Cannot remove item from non-array");
    const [item] = this.splice(index, 1);
    if (this.$immObj) {
      if (!bs.isPrimitive(item)) {
        item.$removeListener(this);
      }
      const newImmObj = [];
      for (let i = 0; i < this.$immObj.length; i++) {
        if (i !== index) {
          const item = this.$immObj[i];
          newImmObj.push(item);
        }
      }
      this.$immObj = newImmObj;
      this.$triggerUpdate();
    }
  }
}

Object.assign(bs.BsObject.prototype, ObjectMixin);
Object.assign(bs.BsArray.prototype, ObjectMixin);

$append = (subject, item) => {
  if (!(subject instanceof $ValueHolder)) throw new Error();
  const subjectValue = $unwrapValue(subject);
  const subjectProp = $unwrapProp(subject);
  const itemValue = $unwrapValue(item);
  item = $toSimpleProp(item);
  if (Array.isArray(subjectValue)) {
    subjectValue.push(item);
  } else if (typeof subject === "string") {
    subjectProp.value += itemValue;
  } else {
    throw new Error();
  }
  subject.trigger({operation: `append`, value: item});
  return subject;
};

bs.isPrimitive = (obj) => {
  return !Array.isArray(obj) && typeof obj !== "object";
}

bs.arr = (...items) => {
  return new bs.BsArray(items);
}

bs.obj = (mutObj) => {
  return new bs.BsObject(mutObj);
}

// Promises =======================================================

bs.resolvePromise = ($p, value) => {
  if ($p.resolved) throw new Error("Promise already resolved");
  $p.value = value;
  $p.resolved = true;
  processPromiseIfNeeded($p);
}

bs.thenPromise = ($p, successFn) => {
  if (!$p.successFns) {
    $p.successFns = [];
  }
  $p.successFns.push(successFn);
  processPromiseIfNeeded($p);
  return $p;
}

const processPromiseIfNeeded = ($p) => {
  if ($p.resolved) {
    let count = 0;
    for (const fn of $p.successFns) {
      count++;
      $p.value = fn($p.value);
      if ($p.value?.$type === "promise") {
        $p.successFns = $p.successFns.slice(count);
        processPromiseIfNeeded($p);
        break;
      }
    }
  };
}

bs.promise = (workFn) => {
  const $p = {
    $type: "promise"
  };
  workFn($p);
  return $p;
}

// Async/Flow Control =============================================

/**
 * Allows execution of sync and async fns together in series.
 * @param {*} value Initial value to enter pipe
 * @param  {...any} fns Step functions to be executed that return values or promises.
 * @returns Either a value (if no async step functions were encountered) or
 *          a promise that will be resolved once all step functions are complete.
 */
const $pipe = (value, ...fns) => {
  let count = 0;
  let promise = null;
  for (const fn of fns) {
    count++;
    const result = fn(value);
    if (result?.$type === "promise") {
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
        if (result2?.$type === "promise") {
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
    if (shouldRun?.$type === "promise") {
      return bs.promise($p => {
        bs.thenPromise(shouldRun, shouldRun => {
          let result;
          if (shouldRun) {
            result = runFn(value);
          } else {
            const restArgs = args.slice(i + 1);
            result = bs.if(value, ...restArgs);
          }
          if (result?.$type === "promise") {
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

bs.while = (value, conditionFn, ...fns) => {
  function finishWhile($p) {
    const whileResult = bs.while(value, conditionFn, ...fns);
    if (whileResult?.$type === "promise") {
      bs.thenPromise(whileResult, whileResult => {
        bs.resolvePromise($p, whileResult);
      });
    } else {
      bs.resolvePromise($p, value);
    }
  }
  while (true) {
    let result = conditionFn(value);
    if (result) {
      if (result?.$type === "promise") {
        return bs.promise($p => {
          bs.thenPromise(result, result => {
            if (result) {
              value = bs.pipe(value, ...fns);
              if (value?.$type === "promise") {
                bs.thenPromise(value, fnsResult => {
                  value = fnsResult;
                  finishWhile($p);
                });
              } else {
                finishWhile($p);
              }
            } else {
              bs.resolvePromise($p, value);
            }
          });
        });
      } else {
        const fnsResult = bs.pipe(value, ...fns);
        if (fnsResult?.$type === "promise") {
          return bs.promise($p => {
            bs.thenPromise(fnsResult, newValue => {
              value = newValue;
              finishWhile($p);
            });
          });
        } else {
          value = fnsResult;
        }
      }
    } else {
      return value;
    }
  }
};

bs.for = (value, list, fn) => {
  let index = 0;
  return bs.while(value,
    $ => {
      const isDone = index >= list.length;
      return !isDone;
    },
    $ => {
      const item = list[index];
      const children = [];
      fn(children, item);
    },
    $ => {
      index++;
      return $;
    }
  );
};

bs.map = (value, list, fn) => {
  const results = [];
  return bs.pipe(value,
    $ => bs.for($, list, item => [
      $ => bs.pipe($, ...fn(item)),
      $ => {
        results.push($);
        return $;
      }
    ]),
    $ => results
  );
};

bs.fn = (fn, argFns) => {
  return bs.pipe(null,
    $ => bs.map(null, argFns, argFn => [
      $ => argFn()
    ]),
    args => fn(...args)
  );
}

bs.error = message => {
  return {$type: "error", message};
}

bs.httpGet = url => {
  return $promise($p => {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        $resolvePromise($p, this.status == 200 ? this.responseText : $error("http get failed"));
      }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
  });
}

bs.tag = (tagType, expressions, props = {}, children = []) => {
  for (const expression of expressions) {
    const expressionType = typeof expression;
    resolveTagAnonymousExpression(expression, expressionType, props, tagType, children);
  }
  for (const [name, value] of Object.entries(props)) {
    const valueType = typeof value;
    delete props[name];
    applyTagProperties(name, value, valueType, props, tagType, children);
  }
  return React.createElement(tagType, props, ...children);
};

bs.children = fn => {
  const children = [];
  fn(children);
  return React.createElement(React.Fragment, null, ...children);
};

/*BROWSER_APP_CODE !!SKIP!! */



















const $main$component$bs = function($add) {
  const newTodoLabel = $state("alright");
  const todos = $state([]);
  const add = () => {
    return $pipe(null,
      $ => $append(todos, { label: newTodoLabel, completed: false }),
      $ => newTodoLabel.assign(""),
    );
  };
  $_delete = (todo) => {
    return $pipe(null,
      $ => $remove(todos, todo),
    );
  };
  markComplete = (todo) => {
    return $pipe(null,
      () => $set(todo.completed, $negate(todo.completed)),
    );
  };
  $add($tag("h1", ["todos"]));
  $add($tag("input", [newTodoLabel, ($v) => newTodoLabel.assign($v)], { onEnter: add }));
  $add($tagFor(todos, ($add, todo) => {
    $add($tag("div", ($add) => {
      $add($tag("button", ["Done"], {onClick: () => markComplete(todo)}));
      $add($tag("span", [$tagIf($expEqual(todo.completed, true), {style: {"textDecoration": " line-through"}})], {onClick: () => markComplete(todo)}));
      $add($tag("button", ["X"], {onClick: () => $_delete(todo)}));
    }));
  }));
};

function $toSimpleProp(value) {
  if (value instanceof $ValueHolder) {
    if (value instanceof $State) {
      value = $unwrapProp(value);
    }
  } else {
    value = $prop(value);
  }
  return value;
}

class $ValueHolder {}

class $State extends $ValueHolder {
  constructor(value) {
    super();
    this.value = $toSimpleProp(value);
  }

  listen(listener) {
    if (!this.listeners) {
      this.listeners = [];
    }
    this.listeners.push(listener);
  }

  assign(value) {
    this.value = $toSimpleProp(value);
    this.trigger();
  }

  trigger(event) {
    if (this.listeners) {
      for (const listener of this.listeners) {
        listener(event);
      }
    }
  }
}

function $unwrapValue(value) {
  while (value instanceof $ValueHolder) {
    value = value.value;
  }
  return value;
}

function $unwrapProp(value) {
  while (!(value instanceof $Prop)) {
    value = value.value;
  }
  return value;
}

function $wrapValueWithProp(value) {
  if (!(value instanceof $Prop)) {
    value = $prop(value);
  }
  return value;
}

function $state(...args) {
  return new $State(...args);
}

class $TagParent {
  constructor() {
    this.add = this.add.bind(this);
  }

  add(tag) {
    const els = tag.els;
    this.mainEl.append(...els);
  }
}

class $Tag extends $TagParent {
  constructor(type, ...args) {
    super();
    const children = [];
    const el = document.createElement(type);
    for (const arg of args) {
      if (Array.isArray(arg)) {
        for (const child of arg) {
          resolveTagAnonymousExpression(child, this, el, type, children);
        }
      } else if (typeof arg === "function") {
        arg(childTag => children.push(childTag));
      } else if (typeof arg === "object") {
        for (const key of Object.keys(arg)) {
          const value = arg[key];
          delete arg[key];
          applyTagProperties(key, value, typeof value, el, type, children);
        }
      } else {
        throw new Error("unexpected tag arg of type \"" + (typeof arg) + "\"");
      }
    }
    for (const child of children) {
      const childType = typeof child;
      if (childType === "string") {
        el.innerText = (el.innerText || "") + child;
      }
    }
    this.mainEl = el;
    this.els = [el];
  }
}

function resolveTagAnonymousExpression(expression, tag, el, tagType, children) {
  if (expression === null || typeof expression === "undefined") return expression;
  let name;
  let value = expression;
  if (value instanceof $State) {
    const state = value;
    state.listen(() => {
      resolveTagAnonymousExpression(state.value, tag, el, tagType, children);
    });
    value = state.value;
  }
  value = $unwrapValue(value);
  const expressionType = typeof value;
  if (tagType === `input`) {
    if (expressionType === "string") {
      name = `value`;
    } else if (expressionType === "function") {
      name = `oninput`;
      const fn = value;
      value = e => fn(e.target.value);
    }
  } else if (expressionType === "string") {
    name = `innerText`;
  } else if (value.style) {
    name = `style`;
    value = value.style;
  } else {
    throw new Error("tag \"" + tagType + "\" does not have a default property for anonymous expression of type \"" + expressionType + "\"");
  }
  if (name === "innerText") {
    children.push(value);
  } else {
    applyTagProperties(name, value, expressionType, el, tagType, children);
  }
}

function applyTagProperties(key, value, valueType, props, tagType, children) {
  if (key === `onEnter`) {
    key = `onkeyup`;
    const origFn = value;
    value = e => {
      if (e.key === `Enter`) origFn();
    };
  } else if (key === `onClick`) {
    key = `onclick`;
  }
  props[key] = value;
}

function $createMarker() {
  const marker = document.createElement("span");
  marker.style.visibility = "hidden";
  return marker;
}

class $TagFor extends $Tag {
  constructor(list, fn) {
    super();
    this.loopMarkers = [];
    const makeLoopMarker = () => {
      const loopMarker = {start: $createMarker(), end: $createMarker()};
      this.loopMarkers.push(loopMarker);
      return loopMarker;
    };
    if (list instanceof $ValueHolder) {
      list.listen(event => {
        const loopMarker = makeLoopMarker();
        this.endMarker.insertBefore(loopMarker.start);
        fn(tag => {
          tag.els.forEach(x => this.endMarker.insertBefore(x));
        }, item);
        this.endMarker.insertBefore(loopMarker.end);
      });
    }
    this.startMarker = $createMarker();
    this.endMarker = $createMarker();
    this.els = [this.startMarker];
    const listValue = $unwrapValue(list);
    if (listValue) {
      for (const item of listValue) {
        const loopMarker = makeLoopMarker();
        this.els.push(loopMarker.start);
        fn(tag => {
          tag.els.forEach(x => this.els.push(x));
        }, item);
        this.els.push(loopMarker.end);
      }
    }
    this.els.push(this.endMarker);
  }

  add() {
    throw new Error("cannot add children to a for loop");
  }
}

class $Prop extends $ValueHolder {
  constructor(value) {
    super();
    if (typeof value === `object`) {
      for (const [childKey, childValue] of Object.entries(value)) {
        value[childKey] = $toSimpleProp(childValue);
      }
    }
    this.value = value;
  }
}

function $tagFor(...args) {
  return new $TagFor(...args);
}

function $prop(value) {
  return new $Prop(value);
}

function $tag(...args) {
  return new $Tag(...args);
}

{
  const root = document.getElementById('root');
  const rootTag = new $TagParent(root);
  rootTag.mainEl = root;
  rootTag.else = [root];
  $main$component$bs(rootTag.add);
}

// function Component1() {
//   const $children = [];
//   let ideas;
//   $statements(
//     () => ideas = $state(React.useState($initState("ideas", $ => ideas = $, $arr()))),
//     () => $children.push(React.createElement("h1", null, "Ideas")),
//     () => $children.push(React.createElement("div", null, null, ...((() => {
//       const $children = [];
//       $statements(
//         () => $for(ideas, idea => [
//           () => $children.push(React.createElement("div", {onClick: () => {$statements(() => idea.set("activity", "---DID IT---"))}}, idea.activity))
//         ])
//       );
//       return $children;
//     })()))),
//     () => $children.push(React.createElement("button", {onClick: () => {
//       $statements(
//         () => $httpGet("https://www.boredapi.com/api/activity"),
//         idea => {ideas.add($obj(JSON.parse(idea)))}
//       );
//     }}, "Add"))
//   );
//   return $children;
// }

})(typeof module !== "undefined" ? module.exports : (window.bs = {}));