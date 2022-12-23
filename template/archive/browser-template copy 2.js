($bs => { //== app code ==========================================

// wrap used built-ins w/ props
// a prop can be listened to/triggered, but also is a proxy to the object it's referencing
$bs.extProp("Math", Math, $ => Math = $);
{
  const Math = $bs.extProps.Math;
  const count = $bs.variable(),
        activities = $bs.variable(),
        displayUser = $bs.variable();
  $bs.statements(null,
    count.$bs.assign((() =>
      Math.$bs.prop("floor").call((() =>
        Math.$bs.prop("random").call().times(10)
      )())
    )()),
    // () => activities.$bs.assign(
    //   $bs.forExpression($bs.range(0, count),
    //     () => httpGet("http://www.boredapi.com/api/activity/").$bs.prop("activity")
    //   )
    // ),
    // () => displayUser.$bs.assign(
    //   () => $bs.fn(user => {
    //     () => console.prop("log").call(str(genderSign, " name: ", user.prop("name").prop("first"), " ", user.prop("name").prop("last"), " of ", user.prop("location").prop("city"), " ", user.prop("location").prop("state")))
    //   })
    // ),
    // () => $bs.for(activities.$bs, activity => {
    //   const user = $bs.prop();
    //   return [
    //     () => user.assign(
    //       httpGet("https://randomuser.me/api/").prop("results").index(0)
    //     ),
    //     () => $bs.if(user.prop("name").prop("first").prop("contains").call("e"), () => {
    //       return [
    //         () => console.prop("log").call($bs.str("skipping ", user.prop("name").prop("first"), " because it contains an \"e\""))
    //       ];
    //     }).else(() => {
    //         const genderSign = $bs.prop();
    //         return [
    //           () => genderSign.assign(
    //             $bs.ifExpression(user.prop("gender").equals("female"), () => "♀").else("♂")
    //           ),
    //           () => console.prop("log").call(str("activity: ", activity))
    //         ];
    //     }),
    //     () => console.prop("log").call("")
    //   ];
    // })
  );
}

})((() => { //== platform code =====================================

const $bs = {};

//== properties ===================================

$bs.obj = function(initialValue) {
  let listeners, value = initialValue;
  return {
    listen: function(listener) {
      listeners.push(listener);
    },
    trigger: function() {
      for (const l of listeners) {
        l(value);
      }
    }
  };
}

$bs.variable = function() {
  let ref = null;
  const variable = $bs.obj();
  variable.assign = function(expr) {
    resolve(expr, value => ref = value);
  };
  return variable;
}

function internalProperty() {
  let value = null;
  return {
    assign: function(fn) {
      const valueProp = fn();
    },
    get value() {
      return value;
    },
    set value(newValue) {
      if (value.$bs) {
        value.assign(newValue);
      } else {
        value = newValue;
      }
    }
  };
}

$bs.extProps = {};
$bs.extProp = function(name, initialValue, setter) {
  const prop = {};
  $bs.extProps[name] = prop;
}

$bs.prop = function() {
  var intProp = internalProperty();
  return new Proxy({}, {
    get(property, name) {
      if (name === "$bs") return intProp;
      return intProp.value?.[name];
    },
    set(property, name, value) {
      if (!intProp.value) throw new Error("value is null");
      intProp.value[name] = value;
    }
  });
}

$bs.assign = function(fn) {
  const prop = fn();
}

$bs.statements = function(actions) {
  let value = null;
  for (const action of actions) {
    value = action.
  }
}

//== promises ======================================

$bs.resolvePromise = ($p, value) => {
  if ($p.resolved) throw new Error("Promise already resolved");
  $p.value = value;
  $p.resolved = true;
  processPromiseIfNeeded($p);
}

$bs.thenPromise = ($p, successFn) => {
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
      if ($p.value?.isPromise) {
        $p.successFns = $p.successFns.slice(count);
        processPromiseIfNeeded($p);
        break;
      }
    }
  };
}

$bs.promise = (workFn) => {
  const $p = {
    isPromise = true
  };
  workFn($p);
  return $p;
}

// //== flow control ==================================

// $bs.pipe = (value, ...fns) => {
//   let count = 0;
//   let promise = null;
//   for (const fn of fns) {
//     count++;
//     const result = fn(value);
//     if (result?.$type === "promise") {
//       promise = result;
//       break;
//     } else {
//       value = result;
//     }
//   }
//   if (promise) {
//     if (count === fns.length) return promise;
//     return $bs.promise($p => {
//       $bs.thenPromise(promise, newValue => {
//         value = newValue;
//         fns = fns.slice(count);
//         const result2 = $bs.pipe(value, ...fns);
//         if (result2?.$type === "promise") {
//           $bs.thenPromise(result2, newValue2 => $bs.resolvePromise($p, newValue2));
//         } else {
//           $bs.resolvePromise($p, result2)
//         }
//       });
//     });
//   } else {
//     return value;
//   }
// }

// $bs.while = (value, conditionFn, ...fns) => {
//   function finishWhile($p) {
//     const whileResult = $bs.while(value, conditionFn, ...fns);
//     if (whileResult?.$type === "promise") {
//       $bs.thenPromise(whileResult, whileResult => {
//         $bs.resolvePromise($p, whileResult);
//       });
//     } else {
//       $bs.resolvePromise($p, value);
//     }
//   }
//   while (true) {
//     let result = conditionFn(value);
//     if (result) {
//       if (result?.$type === "promise") {
//         return $bs.promise($p => {
//           $bs.thenPromise(result, result => {
//             if (result) {
//               value = $bs.pipe(value, ...fns);
//               if (value?.$type === "promise") {
//                 $bs.thenPromise(value, fnsResult => {
//                   value = fnsResult;
//                   finishWhile($p);
//                 });
//               } else {
//                 finishWhile($p);
//               }
//             } else {
//               $bs.resolvePromise($p, value);
//             }
//           });
//         });
//       } else {
//         const fnsResult = $bs.pipe(value, ...fns);
//         if (fnsResult?.$type === "promise") {
//           return $bs.promise($p => {
//             $bs.thenPromise(fnsResult, newValue => {
//               value = newValue;
//               finishWhile($p);
//             });
//           });
//         } else {
//           value = fnsResult;
//         }
//       }
//     } else {
//       return value;
//     }
//   }
// };

// $bs.for = (value, list, fn) => {
//   let index = 0;
//   return $bs.while(value,
//     $ => {
//       const isDone = index >= list.length;
//       return !isDone;
//     },
//     $ => {
//       const item = list[index];
//       const children = [];
//       fn(children, item);
//     },
//     $ => {
//       index++;
//       return $;
//     }
//   );
// };

return $bs;

})());
  