const http = require('http');

let appHtml;



http.createServer((request, response) => {
  undefined
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(appHtml);
  response.end();
}).listen(8080);

console.log("Started!");

appHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>ADHD App</title>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/bootstrap-icons.css">
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js" integrity="sha512-WFN04846sdKMIP5LKNphMaWzU7YpMyCU245etK3g/2ARYbPK9Ub18eG+ljU96qKRCWh+quCY7yefSmlkQw1ANQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <!-- minified for prod
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    -->
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script>

(bs => {

// Object/Properties ===============================

const stringDefaultProps = {
  h1: "innerText"
};

/*

arr react setters ==> react dom
event ==> call react setter
*/

bs.state = (name, setter, initialValue) => {
  const stateObj = React.useRef(new bs.State(name, setter, initialValue)).current;
  stateObj.reactSetter = React.useState(stateObj.$immObj);
  return stateObj;
}

// bs.component = () => {
//   return {
//     stateObjs: [],
//     initState: function(prop, setter, obj) {
//       const stateObj = new bs.State(prop, setter);
//       stateObj.init(obj);
//       this.stateObjs
//     },
//   };
// };

// bs.initState = (prop, setter, obj) => {
//   if (bs.isPrimitive(obj)) return obj;
//   const stateObj = new bs.State(prop, setter);
//   stateObj.init(obj);
//   const stateId = lastStateId++;
//   stateIndex[stateId] = stateObj;
//   obj.$immObj.$stateId = stateId;
//   return obj.$immObj;
// }

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
  constructor(prop, setter, ref) {
    this.prop = prop;
    this.setter = setter;
    this.ref = ref;
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
    this.reactSetter(this.ref.$immObj);
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
      const newImmObj = [...this.$immObj, item];
      this.$immObj = bs.transferMeta(this.$immObj, newImmObj);
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
      this.$immObj = bs.transferMeta(this.$immObj, newImmObj);
      this.$triggerUpdate();
    }
  }
}

Object.assign(bs.BsObject.prototype, ObjectMixin);
Object.assign(bs.BsArray.prototype, ObjectMixin);

bs.isPrimitive = (obj) => {
  return !Array.isArray(obj) && typeof obj !== "object";
}

bs.transferMeta = (oldImmObj, newImmObj) => {
  newImmObj.$objId = oldImmObj.$objId;
  return newImmObj;
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
bs.pipe = (value, ...fns) => {
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
    $ => index < list.length,
    $ => bs.pipe($, ...fn(list[index])),
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

bs.tag = (tagType, expressions, props, children) => {
  for (let expression of expressions) {
    const expressionType = typeof expression;
    if (expressionType === "string") {
      const prop = stringDefaultProps[tagType];
      if (prop) {
        props[prop] = expression;
      } else {
        throw new Error("tag \\"" + tagType + "\\" does not have a default property for anonymous expression of type \\"" + expressionType + "\\"");
      }
    }
  }
  let innerText = "";
  if (props.innerText) {
    innerText = props.innerText;
    delete props.innerText;
  }
  return React.createElement(tagType, props, innerText, children);
};

bs.children = fn => {
  const children = [];
  fn(children);
  return children.length === 1 ? children[0] : children;
};

const $main$component$bs = function($props) {
  return bs.children(($children) => {
    let newTodoLabel, $state_newTodoLabel, todos, $state_todos;
    ;
    bs.pipe(
      () => $state_newTodoLabel = bs.state("newTodoLabel", ($) => newTodoLabel = $, ""),
      () => $state_todos = bs.state("todos", ($) => todos = $, []),
      () => {
        $children.push(bs.tag("h1", ["todos"], {}));
      },
      () => {
        $children.push(bs.tag("input", [], { type: "text" }));
      }
    );
  });
};


{
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    React.createElement($main$component$bs, null, null)
    // React.createElement(React.StrictMode, null, null,
    //   React.createElement($main$bs, null, null)
    // )
  );
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
    </script>
  </body>
</html>

`;