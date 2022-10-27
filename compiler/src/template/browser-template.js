(bs => {

// all objects created in bullscript are proxies, which by default just forward to object
//     objects can be listened to for updates

// primitives are not wrapped

// can do this to get primitive as property: person.$prop("name")


/*
Let s = "hi";
Const $prop_s = $prop(s, $v => s = $v);
Let o = {name: "John"};
Const $prop_o = $prop(s, $v => o = $v);

// top-level bound prop
$tag([$prop_s]);
// nested bound prop
$tag([$bs_ref(o, "name")]);

// set top-level
$prop_s.set("yo");
// get top-level
var blah = s;

// setting nested
o.name = "John";
// getting nested
var blah = o.name;
*/

//== SUPPORT =====================================

const $bs = {};
{
  //== Object ========================================================
  $bs.obj = value => {
    let listeners;
    return new Proxy(value, {
      get(target, property) {
        if (property === "$bs_listeners") {
          if (!listeners) listeners = [];
          return listeners;
        } else if (property === "$bs_type") {          
          return "object";
        } else {
          return target[property];
        }
      },
      set(target, property, value) {
        if (listeners?.length > 0) {
          for (const listener of listeners) {
            listener(target, property, value);
          }
        }
        target[property] = value;
        return true;
      }
    });
  };

  //== Component State ===============================================
  class State {
    constructor(value, setter) {
      this.$bs_type = "state";
      this.value = value;
      this.setter = setter;
    }

    get $bs_listeners() {
      if (!this.listeners) this.listeners = [];
      return this.listeners;
    }

    resolve() {
      return this.value;
    }

    set(value) {
      const listeners = this.$bs_listeners;
      if (listeners?.length > 0) {
        for (const listener of listeners) {
          listener({operation: "set", target: this, value});
        }
      }
      this.value = value;
    }

    trigger(event) {
      const listeners = this.$bs_listeners;
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  class Component {
    constructor() {
      this.states = [];
    }

    $bs_state(initializer, setter) {
      this.states.push({initializer, setter});
      const initialValue = initializer();
      let state;
      if (initialValue.$bs_type === "promise") {
        state = new State(null, setter);
        $bs.thenPromise(initialValue, value => {
          state.set(value);
        });
      } else {
        state = new State(initialValue, setter);
      }
      return state;
    }
  }

  $bs.component = () => new Component();

  //== Promises =======================================================

  $bs.resolvePromise = (p, value) => {
    if (p.resolved) throw new Error("Promise already resolved");
    p.value = value;
    p.resolved = true;
    processPromiseIfNeeded(p);
  }

  $bs.thenPromise = (p, successFn) => {
    if (!p.successFns) {
      p.successFns = [];
    }
    p.successFns.push(successFn);
    processPromiseIfNeeded(p);
    return p;
  }

  function processPromiseIfNeeded(p) {
    if (p.resolved) {
      let count = 0;
      for (const fn of p.successFns) {
        count++;
        p.value = fn(p.value);
        if (p.value?.$bs_type === "promise") {
          p.successFns = p.successFns.slice(count);
          processPromiseIfNeeded(p);
          break;
        }
      }
    };
  }

  $bs.promise = (workFn) => {
    const p = {
      $bs_type: "promise"
    };
    workFn(p);
    return p;
  }

  //== Async/Flow Control =============================================

  /**
   * Allows execution of sync and async fns together in series.
   * @param {*} value Initial value to enter pipe
   * @param  {...any} fns Step functions to be executed that return values or promises.
   * @returns Either a value (if no async step functions were encountered) or
   *          a promise that will be resolved once all step functions are complete.
   */
   $bs.pipe = (value, ...fns) => {
    let count = 0;
    let promise = null;
    for (const fn of fns) {
      count++;
      const result = fn(value);
      if (result?.$bs_type === "promise") {
        promise = result;
        break;
      } else {
        value = result;
      }
    }
    if (promise) {
      if (count === fns.length) return promise;
      return $bs.promise($p => {
        $bs.thenPromise(promise, newValue => {
          value = newValue;
          fns = fns.slice(count);
          const result2 = $bs.pipe(value, ...fns);
          if (result2?.$bs_type === "promise") {
            $bs.thenPromise(result2, newValue2 => $bs.resolvePromise($p, newValue2));
          } else {
            $bs.resolvePromise($p, result2)
          }
        });
      });
    } else {
      return value;
    }
  }

  //== Tag ======================================================

  $bs.TagParent = class TagParent {
    constructor() {
      this.add = this.add.bind(this);
    }
  
    add(tag) {
      const els = tag.els;
      this.mainEl.append(...els);
    }
  }
  
  class Tag extends $bs.TagParent {
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
    const bsType = value?.$bs_type;
    if (bsType === "state" || bsType === "reference") {
      const stateOrRef = value;
      stateOrRef.$bs_listeners.push(({operation, value}) => {
        if (operation === "set") resolveTagAnonymousExpression(value, tag, el, tagType, children);
      });
      value = stateOrRef.resolve();
    } else if (bsType === "expression") {
      const expr = buildExpression(value);
      value = expr.calculateValue();
      expr.$bs_listeners.push(() => {
        
      });
    }
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
  
  function createMarker() {
    const marker = document.createElement("span");
    marker.style.visibility = "hidden";
    return marker;
  }

  function unwrapValue(obj) {
    const bsType = obj?.$bs_type;
    if (bsType === "state" || bsType === "reference") return obj.resolve();
    else return obj;
  }
  
  class TagFor extends Tag {
    constructor(list, fn) {
      super();
      this.loopMarkers = [];
      const makeLoopMarker = () => {
        const loopMarker = {start: createMarker(), end: createMarker()};
        this.loopMarkers.push(loopMarker);
        return loopMarker;
      };
      const bsType = list?.$bs_type;
      if (bsType === "state" || bsType === "object" || bsType === "reference") {
        list.$bs_listeners.push(event => {
          if (event.operation === "append") {
            const loopMarker = makeLoopMarker();
            this.endMarker.parentNode.insertBefore(loopMarker.start, this.endMarker);
            fn(tag => {
              tag.els.forEach(x => this.endMarker.parentNode.insertBefore(x, this.endMarker));
            }, event.value);
            this.endMarker.parentNode.insertBefore(loopMarker.end, this.endMarker);
          }
        });
      }
      this.startMarker = createMarker();
      this.endMarker = createMarker();
      this.els = [this.startMarker];
      const listValue = unwrapValue(list);
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

  $bs.tagFor = (...args) => {
    return new TagFor(...args);
  }
  
  $bs.tag = (...args) => {
    return new Tag(...args);
  }
}

//== Expressions ==============================

$bs.if = (...items) => {
  return {
    $bs_type: "expression",
    expressionType: "if",
    items,
  };
};

$bs.equals = (thing1, thing2) => {
  return {
    $bs_type: "expression",
    expressionType: "equals",
    thing1,
    thing2,
  };
};

$bs.ref = (subject, ...items) => {
  return {
    $bs_type: "expression",
    expressionType: "ref",
    items,
  };
};

//== Util ====================================

$bs.append = (subject, item) => {
  const subjectValue = unwrapValue(subject);
  if (typeof item === "string" && !isBsContainer(subject)) throw new Error("if appending to string, subject must be a bs container");
  if (Array.isArray(subjectValue)) {
    subjectValue.push(item);
  } else if (typeof subject === "string") {
    const itemValue = unwrapValue(subject);
    subject.set(subject.resolve() += itemValue);
  } else {
    throw new Error();
  }
  subject.trigger({operation: `append`, value: item});
  return subject;
};

function isBsContainer(value) {
  const bsType = value?.$bs_type;
  if (bsType === "state" || bsType === "reference") return true;
  return false;
}

//== App =====================================

/*BROWSER_APP_CODE !!SKIP!! */

const $bs_main$bs = function($bs_add) {
  const component = $bs.component();
  let newTodoLabel, todos;
  const $bs_newTodoLabel = component.$bs_state(() => {
    return $bs.pipe(null,
      () => "alright",
    );
  }, $bs_v => newTodoLabel = $bs_v);
  const $bs_todos = component.$bs_state(() => {
    return $bs.pipe(null,
      () => $bs.obj([]),
    );
  }, $bs_value => todos = $bs_value);
  const add = () => {
    return $bs.pipe(null,
      $ => $bs.append($bs_todos, { label: newTodoLabel, completed: false }),
      $ => newTodoLabel.set(""),
    );
  };
  $bs_esc_delete = (todo) => {
    return $bs.pipe(null,
      $ => $bs.remove(todos, todo),
    );
  };
  markComplete = (todo) => {
    return $bs.pipe(null,
      () => todo.completed = !todo.completed,
    );
  };
  $bs_add($bs.tag("h1", ["todos"]));
  $bs_add($bs.tag("input", [$bs_newTodoLabel, ($bs_v) => $bs_newTodoLabel.set($bs_v)], { onEnter: add }));
  $bs_add($bs.tagFor($bs_todos, ($bs_add, todo) => {
    $bs_add($bs.tag("div", ($bs_add) => {
      $bs_add($bs.tag("button", ["Done"], {onClick: () => markComplete(todo)}));
      $bs_add($bs.tag("span", [$bs.if($bs.equals($bs.ref(todo, "completed"), true), {style: ["textDecoration: line-through"]}), $bs.ref(todo, "label")], {onClick: () => markComplete(todo)}));
      $bs_add($bs.tag("button", ["X"], {onClick: () => $bs_esc_delete(todo)}));
    }));
  }));
};

{
  const root = document.getElementById('root');
  const rootTag = new $bs.TagParent(root);
  rootTag.mainEl = root;
  rootTag.els = [root];
  $bs_main$bs(rootTag.add);
}

})(typeof module !== "undefined" ? module.exports : (window.bs = {}));