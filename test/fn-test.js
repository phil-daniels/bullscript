const bs = require("./browser-test-template.js");

function jump(list, retValue, ...items) {
  list.length = 0;
  items.forEach(x => list.push(x));
  return retValue;
}

// sync args
{
  const passedArgs = [];
  const result = bs.fn(jump, [
    $ => passedArgs,
    $ => "done jumping",
    $ => "1",
    $ => "2",
    $ => "3"
  ]);
  if (JSON.stringify(passedArgs) !== JSON.stringify(["1", "2", "3"])) throw new Error(JSON.stringify(passedArgs));
  if (result !== "done jumping") throw new Error(JSON.stringify(result));
}

// async args
{
  const passedArgs = [];
  const result = bs.fn(jump, [
    $ => passedArgs,
    $ => "done jumping",
    $ => "1",
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, "2");
      }, 0);
    }),
    $ => "3",
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, "4");
      }, 0);
    }),
  ]);
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (JSON.stringify(passedArgs) !== JSON.stringify(["1", "2", "3", "4"])) throw new Error(JSON.stringify(passedArgs));
    if (value !== "done jumping") throw new Error(JSON.stringify(value));
  });
}
