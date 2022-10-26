(bs => {

/*BROWSER_APP_CODE !!SKIP!! */

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
$tag([o.$prop("name")]);

// set top-level
$prop_s.set("yo");
// get top-level
var blah = s;

// setting nested
o.name = "John";
// getting nested
var blah = o.name;
*/

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
      () => [],
    );
  }, $bs_value => todos = $bs_value);
  const add = () => {
    return $bs.pipe(null,
      $ => $bs.append(todos, { label: newTodoLabel, completed: false }),
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
      $bs_add($bs.tag("span", [$bs_if($bs_equals(todo.completed, true), {style: {"textDecoration": " line-through"}})], {onClick: () => markComplete(todo)}));
      $bs_add($bs.tag("button", ["X"], {onClick: () => $bs_esc_delete(todo)}));
    }));
  }));
};

{
  const root = document.getElementById('root');
  const rootTag = new $TagParent(root);
  rootTag.mainEl = root;
  rootTag.els = [root];
  $bs_main$bs(rootTag.add);
}

//== SUPPORT =====================================

{
  $bs = {};

  class State {
    constructor(value, setter) {
      this.value = value;
      this.setter = setter;
    }
  }

  class Component {
    constructor() {
      states = [];
    }

    $bs_state(initializer, setter) {
      states.push({initializer, setter});
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
}

})(typeof module !== "undefined" ? module.exports : (window.bs = {}));