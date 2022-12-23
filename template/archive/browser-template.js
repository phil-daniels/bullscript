($bs_ => { //== app code ==========================================

// wrap used built-ins w/ props
// a prop can be listened to/triggered, but also is a proxy to the object it's referencing
$bs_.extProp("Math", Math, $ => Math = $);
{
  const Math = $bs_.extProps.Math;
  const count = $bs_.prop(),
        activities = $bs_.prop(),
        displayUser = $bs_.prop();
  $bs_.pipe(null,
    () => count.$bs_.assign(
      () => Math.$bs_.prop("floor").call(
        () => Math.$bs_.prop("random").call().times(10)
      )
    ),
    () => activities.$bs_.assign(
      $bs_.forExpression($bs_.range(0, count),
        () => httpGet("http://www.boredapi.com/api/activity/").$bs_.prop("activity")
      )
    ),
    () => displayUser.$bs_.assign(
      () => $bs_.fn(user => {
        () => console.prop("log").call(str(genderSign, " name: ", user.prop("name").prop("first"), " ", user.prop("name").prop("last"), " of ", user.prop("location").prop("city"), " ", user.prop("location").prop("state")))
      })
    ),
    () => $bs_.for(activities.$bs_, activity => {
      const user = $bs_.prop();
      return [
        () => user.assign(
          httpGet("https://randomuser.me/api/").prop("results").index(0)
        ),
        () => $bs_.if(user.prop("name").prop("first").prop("contains").call("e"), () => {
          return [
            () => console.prop("log").call($bs_.str("skipping ", user.prop("name").prop("first"), " because it contains an \"e\""))
          ];
        }).else(() => {
            const genderSign = $bs_.prop();
            return [
              () => genderSign.assign(
                $bs_.ifExpression(user.prop("gender").equals("female"), () => "♀").else("♂")
              ),
              () => console.prop("log").call(str("activity: ", activity))
            ];
        }),
        () => console.prop("log").call("")
      ];
    })
  );
}

})((() => { //== platform code =====================================

const $bs_ = {};

//== properties ===================================

$bs_.extProps = {};
$bs_.extProp = function(name, initialValue, setter) {
  const prop = {};
  $bs_.extProps[name] = prop;
}

$bs_.prop = function() {
  return {

  };
}

//== promises ======================================

$bs_.resolvePromise = ($p, value) => {
  if ($p.resolved) throw new Error("Promise already resolved");
  $p.value = value;
  $p.resolved = true;
  processPromiseIfNeeded($p);
}

$bs_.thenPromise = ($p, successFn) => {
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

$bs_.promise = (workFn) => {
  const $p = {
    $type: "promise"
  };
  workFn($p);
  return $p;
}

//== flow control ==================================

$bs_.pipe = (value, ...fns) => {
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
    return $bs_.promise($p => {
      $bs_.thenPromise(promise, newValue => {
        value = newValue;
        fns = fns.slice(count);
        const result2 = $bs_.pipe(value, ...fns);
        if (result2?.$type === "promise") {
          $bs_.thenPromise(result2, newValue2 => $bs_.resolvePromise($p, newValue2));
        } else {
          $bs_.resolvePromise($p, result2)
        }
      });
    });
  } else {
    return value;
  }
}

$bs_.while = (value, conditionFn, ...fns) => {
  function finishWhile($p) {
    const whileResult = $bs_.while(value, conditionFn, ...fns);
    if (whileResult?.$type === "promise") {
      $bs_.thenPromise(whileResult, whileResult => {
        $bs_.resolvePromise($p, whileResult);
      });
    } else {
      $bs_.resolvePromise($p, value);
    }
  }
  while (true) {
    let result = conditionFn(value);
    if (result) {
      if (result?.$type === "promise") {
        return $bs_.promise($p => {
          $bs_.thenPromise(result, result => {
            if (result) {
              value = $bs_.pipe(value, ...fns);
              if (value?.$type === "promise") {
                $bs_.thenPromise(value, fnsResult => {
                  value = fnsResult;
                  finishWhile($p);
                });
              } else {
                finishWhile($p);
              }
            } else {
              $bs_.resolvePromise($p, value);
            }
          });
        });
      } else {
        const fnsResult = $bs_.pipe(value, ...fns);
        if (fnsResult?.$type === "promise") {
          return $bs_.promise($p => {
            $bs_.thenPromise(fnsResult, newValue => {
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

$bs_.for = (value, list, fn) => {
  let index = 0;
  return $bs_.while(value,
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

return $bs_;

})());
