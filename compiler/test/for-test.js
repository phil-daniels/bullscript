const bs = require("./browser-test-template.js");

// sync steps
{
  let total = 0;
  const result = bs.for(0, [10, 20, 30], num => [
    $ => {
      total += num;
      return $;
    },
    $ => {
      total += 1;
      return $ + 1;
    }
  ]);
  if (result !== 3) throw new Error(JSON.stringify(result));
  if (total !== 63) throw new Error(JSON.stringify(total));
}

// async steps
{
  let total = 0;
  const result = bs.for(0, [10, 20, 30], num => [
    $ => bs.promise($p => {
      setTimeout(() => {
        total += num;
        bs.resolvePromise($p, $);
      }, 0);
    }),
    $ => bs.promise($p => {
      setTimeout(() => {
        total += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    })
  ]);
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 3) throw new Error(JSON.stringify(value));
    if (total !== 63) throw new Error(JSON.stringify(total));
  });
}

// async/sync mix
{
  let total = 0;
  const result = bs.for(0, [10, 20, 30], num => [
    $ => bs.promise($p => {
      setTimeout(() => {
        total += num;
        bs.resolvePromise($p, $);
      }, 0);
    }),
    $ => {
      total += num;
      return $;
    },
    $ => bs.promise($p => {
      setTimeout(() => {
        total += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    }),
    $ => {
      total += 1;
      return $ + 1;
    }
  ]);
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 6) throw new Error(JSON.stringify(value));
    if (total !== 126) throw new Error(JSON.stringify(total));
  });
}
