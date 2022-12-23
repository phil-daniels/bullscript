const bs = require("./browser-test-template.js");

// sync steps
{
  const result = bs.map(0, [10, 20, 30], num => {
    let newNum;
    return [
      $ => newNum = num * 2,
      $ => newNum + 1
    ];
  });
  if (JSON.stringify(result) !== JSON.stringify([21, 41, 61])) throw new Error(JSON.stringify(result));
}

// async steps
{
  const result = bs.map(0, [10, 20, 30], num => {
    let newNum;
    return [
      $ => bs.promise($p => {
        setTimeout(() => {
          newNum = num * 2;
          bs.resolvePromise($p, $);
        }, 0);
      }),
      $ => bs.promise($p => {
        setTimeout(() => {
          bs.resolvePromise($p, newNum + 1);
        }, 0);
      })
    ];
  });
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (JSON.stringify(value) !== JSON.stringify([21, 41, 61])) throw new Error(JSON.stringify(value));
  });
}

// async/sync mix
{
  const result = bs.map(0, [10, 20, 30], num => {
    let newNum;
    return [
      $ => bs.promise($p => {
        setTimeout(() => {
          newNum = num * 2;
          bs.resolvePromise($p, $);
        }, 0);
      }),
      $ => newNum *= 2,
      $ => bs.promise($p => {
        setTimeout(() => {
          newNum++;
          bs.resolvePromise($p, $);
        }, 0);
      }),
      $ => newNum + 1,
    ];
  });
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (JSON.stringify(value) !== JSON.stringify([42, 82, 122])) throw new Error(JSON.stringify(value));
  });
}

