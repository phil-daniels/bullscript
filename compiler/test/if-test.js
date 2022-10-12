const bs = require("./browser-test-template.js");

// sync positive condition, sync step
{
  let num = 0;
  const result = bs.if(5,
    $ => num === 0,
    $ => {
      num++;
      return $ + 4;
    },
  );
  if (result !== 9) throw new Error(JSON.stringify(result));
  if (num !== 1) throw new Error(JSON.stringify(result));
}

// sync negative condition, sync step
{
  let num = 0;
  const result = bs.if(5,
    $ => num === 99,
    $ => {
      num++;
      return $ + 4;
    },
  );
  if (result !== 5) throw new Error(JSON.stringify(result));
  if (num !== 0) throw new Error(JSON.stringify(num));
}

// sync negative condition, sync positive else if condition, sync step
{
  let num = 0;
  const result = bs.if(5,
    $ => num === 99,
    $ => { throw new Error() },
    $ => num === 0,
    $ => {
      num += 10;
      return $ + 25
    }
  );
  if (result !== 30) throw new Error(JSON.stringify(result));
  if (num !== 10) throw new Error(JSON.stringify(num));
}


// sync negative condition, sync else step
{
  let num = 0;
  const result = bs.if(5,
    $ => num === 99,
    $ => { throw new Error() },
    $ => {
      num += 10;
      return $ + 25
    }
  );
  if (result !== 30) throw new Error(JSON.stringify(result));
  if (num !== 10) throw new Error(JSON.stringify(num));
}

// sync negative condition, sync negative else if condition, sync else step
{
  let num = 0;
  const result = bs.if(5,
    $ => num === 99,
    $ => { throw new Error() },
    $ => num === 5,
    $ => { throw new Error() },
    $ => {
      num += 10;
      return $ + 25
    }
  );
  if (result !== 30) throw new Error(JSON.stringify(result));
  if (num !== 10) throw new Error(JSON.stringify(num));
}

// async positive condition, sync step
{
  let num = 0;
  const result = bs.if(5,
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, num === 0);
      }, 0);
    }),
    $ => {
      num += 50;
      return 60
    }
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 60) throw new Error(JSON.stringify(value));
    if (num !== 50) throw new Error(JSON.stringify(num));
  });
}

// sync positive condition, async step
{
  let num = 5;
  const result = bs.if(5,
    $ => num === 5,
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 50;
        bs.resolvePromise($p, 60 + $);
      }, 0);
    })
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 65) throw new Error(JSON.stringify(value));
    if (num !== 55) throw new Error(JSON.stringify(num));
  });
}

// async positive condition, async step
{
  let num = 5;
  const result = bs.if(5,
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, num === 5);
      }, 0);
    }),
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 50;
        bs.resolvePromise($p, 60 + $);
      }, 0);
    })
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 65) throw new Error(JSON.stringify(value));
    if (num !== 55) throw new Error(JSON.stringify(num));
  });
}

// async negative condition, async else step
{
  let num = 5;
  const result = bs.if(5,
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, num === 99);
      }, 0);
    }),
    $ => { throw new Error() },
    $ => bs.promise($p => {
      setTimeout(() => {
        num += 50;
        bs.resolvePromise($p, 60 + $);
      }, 0);
    })
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 65) throw new Error(JSON.stringify(value));
    if (num !== 55) throw new Error(JSON.stringify(num));
  });
}

// async negative condition, async negative else condition, sync else step
{
  let num = 5;
  const result = bs.if(5,
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, num === 99);
      }, 0);
    }),
    $ => { throw new Error() },
    $ => bs.promise($p => {
      setTimeout(() => {
        bs.resolvePromise($p, num === 100);
      }, 0);
    }),
    $ => { throw new Error() },
    $ => {
      num += 50;
      return 60 + $;
    }
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (value !== 65) throw new Error(JSON.stringify(value));
    if (num !== 55) throw new Error(JSON.stringify(num));
  });
}