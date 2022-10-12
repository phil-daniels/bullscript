const bs = require("./browser-test-template");
const pipe = bs.pipe;

// sync, sync, sync
{
  const list = [];
  const result = pipe("hi-",
    $ => {
      list.push("1");
      return $ + "a";
    },
    $ => {
      list.push("2");
      return $ + "b";
    },
    $ => {
      list.push("3");
      return $ + "c";
    },
  );
  if (JSON.stringify(list) !== JSON.stringify(["1", "2", "3"])) throw new Error(JSON.stringify(list));
  if (result !== "hi-abc") throw new Error(JSON.stringify(result));
}

// sync, async, sync
{
  const list = [];
  const result = pipe("hi-",
    $ => {
      list.push("1");
      return $ + "a";
    },
    $ => {
      return bs.promise($p => {
        setTimeout(() => {
          list.push("2");
          bs.resolvePromise($p, $ + "b");
        }, 0);
      });
    },
    $ => {
      list.push("3");
      return $ + "c";
    },
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (JSON.stringify(list) !== JSON.stringify(["1", "2", "3"])) throw new Error(JSON.stringify(list));
    if (value !== "hi-abc") throw new Error(JSON.stringify(value));
  });
}

// async, async, async
{
  const list = [];
  const result = pipe("hi-",
    $ => {
      return bs.promise($p => {
        setTimeout(() => {
          list.push("1");
          bs.resolvePromise($p, $ + "a");
        }, 0);
      });
    },
    $ => {
      return bs.promise($p => {
        setTimeout(() => {
          list.push("2");
          bs.resolvePromise($p, $ + "b");
        }, 0);
      });
    },
    $ => {
      return bs.promise($p => {
        setTimeout(() => {
          list.push("3");
          bs.resolvePromise($p, $ + "c");
        }, 0);
      });
    },
  );
  if (result?.$type !== "promise") throw new Error(JSON.stringify(result));
  bs.thenPromise(result, value => {
    if (JSON.stringify(list) !== JSON.stringify(["1", "2", "3"])) throw new Error(JSON.stringify(list));
    if (value !== "hi-abc") throw new Error(JSON.stringify(value));
  });
}
