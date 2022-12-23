//== Modules ===============================================

const _modules = {};
const _moduleCache = {};

const _importModule = name => {
  return {type: "module", name};
};

const _import = (moduleName, path) => {
  const key = moduleName + ":" + path;
  let fileModule = _moduleCache[key];
  if (!fileModule) {
    const module = _modules[moduleName];
    if (!module) throw new Error("No module named \"" + moduleName + "\"");
    const fileModuleFn = module[path];
    fileModule = fileModuleFn();
    _moduleCache[key] = fileModule;
  }
  return fileModule;
};

const _declareFile = (moduleName, path, fn) => {
  let module = _modules[moduleName];
  if (!module) {
    module = {};
    _modules[moduleName] = module;
  }
  module[path] = fn;
};

//== Promises ===============================================

const _resolvePromise = (p, value) => {
  if (p.resolved) throw new Error("Promise already resolved");
  p.value = value;
  p.resolved = true;
  _processPromiseIfNeeded(p);
}

const _thenPromise = (p, successFn) => {
  if (!p.successFns) {
    p.successFns = [];
  }
  p.successFns.push(successFn);
  _processPromiseIfNeeded(p);
  return p;
}

const _processPromiseIfNeeded = (p) => {
  if (p.resolved) {
    let count = 0;
    for (const fn of p.successFns) {
      count++;
      p.value = fn(p.value);
      if (p.value?.type === "promise") {
        p.successFns = p.successFns.slice(count);
        _processPromiseIfNeeded(p);
        break;
      }
    }
  };
}

const _promise = (workFn) => {
  const p = {
    type: "promise"
  };
  workFn(p);
  return p;
}

const _pipe = (...fns) => {
  let count = 0;
  let promise = null;
  let value = null;
  for (const fn of fns) {
    count++;
    const result = fn(value);
    if (result?.type === "promise") {
      promise = result;
      break;
    } else {
      value = result;
    }
  }
  if (promise) {
    if (count === fns.length) return promise;
    return _promise($p => {
      _thenPromise(promise, newValue => {
        value = newValue;
        fns = fns.slice(count);
        const result2 = _pipe(value, ...fns);
        if (result2?.type === "promise") {
          _thenPromise(result2, newValue2 => _resolvePromise($p, newValue2));
        } else {
          _resolvePromise($p, result2)
        }
      });
    });
  } else {
    return value;
  }
}
