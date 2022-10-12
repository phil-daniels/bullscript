const bs = require("./browser-test-template.js");

// sync positive condition, sync step
{
  let num = 0;
  const result = bs.while(3,
    $ => num < 6,
    $ => {
      num += 2;
      return $ + 2;
    },
  );
  if (result !== 9) throw new Error(JSON.stringify(result));
  if (num !== 6) throw new Error(JSON.stringify(result));
}

// sync positive condition, multiple sync steps
{
  let num = 0;
  const result = bs.while(3,
    $ => num <= 6,
    $ => {
      num += 1;
      return $ + 1;
    },
    $ => {
      num += 2;
      return $ + 2;
    },
    $ => {
      num += 3;
      return $ + 3;
    },
  );
  if (result !== 15) throw new Error(JSON.stringify(result));
  if (num !== 12) throw new Error(JSON.stringify(num));
}

// sync negative condition, skip 1 sync step
{
  let num = 0;
  const result = bs.while(3,
    $ => num > 6,
    $ => {
      num += 1;
      return $ + 1;
    },
  );
  if (result !== 3) throw new Error(JSON.stringify(result));
  if (num !== 0) throw new Error(JSON.stringify(num));
}

// async positive condition, multiple sync steps
{
  let num = 0;
  const result = bs.while(3,
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, num < 6);
      }, 0);
    }),
    $ => {
      num += 1;
      return $ + 1;
    },
    $ => {
      num += 1;
      return $ + 1;
    },
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 9) throw new Error(JSON.stringify(value));
    if (num !== 6) throw new Error(JSON.stringify(num));
  });
}

// async negative condition, skip multiple sync steps
{
  let num = 0;
  const result = bs.while(3,
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, num > 6);
      }, 0);
    }),
    $ => {
      num += 1;
      return $ + 1;
    },
    $ => {
      num += 1;
      return $ + 1;
    },
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 3) throw new Error(JSON.stringify(value));
    if (num !== 0) throw new Error(JSON.stringify(num));
  });
}

// sync positive condition, multiple async steps
{
  let num = 0;
  const result = bs.while(3,
    $ => num < 6,
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    }),
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    }),
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 9) throw new Error(JSON.stringify(value));
    if (num !== 6) throw new Error(JSON.stringify(num));
  });
}

// sync negative condition, skip multiple async steps
{
  let num = 0;
  const result = bs.while(3,
    $ => num > 6,
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    }),
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    }),
  );
  if (result !== 3) throw new Error(JSON.stringify(result));
  if (num !== 0) throw new Error(JSON.stringify(num));
}

// sync positive condition, multiple async and sync steps
{
  let num = 0;
  const result = bs.while(3,
    $ => num < 6,
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    }),
    $ => {
      num += 1;
      return $ + 1;
    },
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 1;
        bs.resolvePromise($p, $ + 1);
      }, 0);
    }),
    $ => {
      num += 1;
      return $ + 1;
    },
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 11) throw new Error(JSON.stringify(value));
    if (num !== 8) throw new Error(JSON.stringify(num));
  });
}