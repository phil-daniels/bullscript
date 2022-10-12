const fs = require("fs");
const esbuild = require("esbuild");

let input, eatenInput, makeData, capturedItems, lastLoggedInput, serverInitCode, serverRequestCode,
    varDeclarations;

const block = $(
  () => {
    const savedVarDeclarations = varDeclarations;
    varDeclarations = [];
    return $(
      () => whilst(() => not(`}`),
        () => statement
      ).asList("statements"),
      () => opt(`}`)
    ).make(data => {
      const myVarDeclarations = varDeclarations;
      varDeclarations = savedVarDeclarations;
      return `
        const $children = [];
        ${myVarDeclarations.length > 0 ? `let ${myVarDeclarations.join(",")};` : ``}
        bs.pipe(
          ${data.statements.map(x => `() => {${x}}`)}
        );
        return $children;
      `;
    });
  }
);

const statement = $(
  () => $(
    () => any(
      () => stateDeclaration,
      () => tag,
    )
  )
);

const stateDeclaration = $(
  () => $(
    () => `state`,
    () => ws(1),
    () => identifier().as("name"),
    () => ws,
    () => `=`,
    () => ws,
    () => expression.as("expression")
  ).make(data => [
    () => {
      varDeclarations.push(data.name);
      varDeclarations.push(`$assign_${data.name}`);
      return `$assign_${data.name} = bs.state(React.useState(bs.initState("${data.name}", $ => ${data.name} = $, ${data.expression})));`;
    }
  ])
);

const tag = $(
  () => $(
    () => `<`,
    () => ws,
    () => identifierWithDashes().as(`name`),
    () => ws,
    () => whilstDelimited(
      () => not(any(`/>`, `>`)), // condition
      () => any(`,`, `\n`),      // delimiter
      () => any(
        () => $(
          () => ws,
          () => identifierWithDashes().as("name"),
          () => ws,
          () => `:`,
          () => ws,
          () => expression.as("value")
        ).make(data => `
          ${data.name}: ${data.value},
        `),
        () => stringExpression.as(`value`).make(data => `
          innerText: ${data.value}
        `),
        () => stateReference.as(`value`).make(data => {
          const tagName = data.name;
          if (tagName === `input`) {
            return `
              onChange={($e) => ${value.name}.$set($e.target.value)}
              value={${value.name}.$get()}
            `;
          }
        }),
      )
    ).asList(`props`)
  ).make(data => data.props.join(`,`))
);

const stateReference = $(
  `*`, identifier().as(`name`)
);

const expression = $(
  () => any(
    () => stringExpression
  )
);

const stringExpression = $(
  () => $(
    () => `"`,
    () => whilst(() => not(unescaped(`"`)),
      () => when(() => `#{`,
        () => stringExpressionCodeBlock.asList("pieces")
      ).otherwise(
        () => eatUntil(any(`#{`, unescaped(`"`))).asList("pieces")
      ),
    ),
    () => `"`
  ).make(data => [
    () => `"`,
    () => data.pieces?.join(),
    () => `"`
  ])
);

const stringExpressionCodeBlock = $(
  () => $(
    () => `{`,
    expression.as(`expression`),
    () => unescaped(`}`),
  ).make(data => [
    () => `\${${data.expression}}`
  ])
);

// SUPPORT ////////////////

function $(...children) {
  const pattern = {
    children,
    type: "pattern",
    make: makeFn => {
      return copy(pattern, {makeFn});
    },
    keep: () => {
      return pattern.make(data => data.input);
    },
    as: name => {
      return copy(pattern, {asName: name});
    },
    asList: name => {
      return copy(pattern, {asListName: name});
    },
  };
  return pattern;
}

function when(conditionFn, actionFn) {
  const thisWhen = {
    type: `when`,
    branches: [{conditionFn, actionFn}],
    otherwiseWhen: (conditionFn, actionFn) => {
      const otherWhen = copy(thisWhen);
      otherWhen.branches.push({conditionFn, actionFn});
      return otherWhen;
    },
    otherwise: actionFn => {
      const otherWhen = copy(thisWhen);
      otherWhen.branches.push({conditionFn: null, actionFn});
      return otherWhen;
    },
  };
  return thisWhen;
}

function whilstDelimited(conditionFn, delimiter, actionFn) {
  return whilst(conditionFn, actionFn, delimiter);
}

function whilst(conditionFn, actionFn, delimiter = null) {
  const thisWhilst = {
    type: `whilst`,
    conditionFn: () => supressError(conditionFn),
    actionFn,
    delimiter,
    make: makeFn => {
      return $(thisWhilst).make(makeFn);
    },
    as: makeFn => {
      return $(thisWhilst).as(makeFn);
    },
    asList: makeFn => {
      return $(thisWhilst).asList(makeFn);
    },
  };
  return thisWhilst;
}

function not(value) {
  return {type: `not`, value};
}

function opt(value) {
  return {type: `opt`, value};
}

function any(...args) {
  return {type: `any`, values: args};
}

function supressError(value) {
  return {type: `supressError`, value};
}

function ws(minCount = null) {
  return {type: `ws`, minCount};
}

function identifier() {
  return $({type: `identifier`});
}

function identifierWithDashes() {
  return $({type: `identifierWithDashes`});
}

function unescaped(value) {
  return {type: `unescaped`, value};
}

function rollback(value) {
  return {type: `rollback`, value};
}

function eatUntil(value) {
  return $({type: `eatUntil`, value});
}

const compile = (indexTemplatePath, browserTemplatePath, serverTemplatePath, files) => {
  let serverTemplateCode = fs.readFileSync(serverTemplatePath, 'utf-8');
  let browserTemplateCode = fs.readFileSync(browserTemplatePath, 'utf-8');
  let indexTemplateCode = fs.readFileSync(indexTemplatePath, 'utf-8');
  let {serverInitCode, serverRequestCode, browserCode} = generateAppCode(files);
  browserCode = esbuild.transformSync(browserCode)?.code;
  browserTemplateCode = browserTemplateCode.replace("/*BROWSER_APP_CODE*/", browserCode);
  indexTemplateCode = indexTemplateCode.replace("/*BROWSER_CODE*/", browserTemplateCode);
  serverTemplateCode = serverTemplateCode
      .replace("/*BROWSER_HTML*/", indexTemplateCode)
      .replace("/*SERVER_INIT_CODE*/", serverInitCode)
      .replace("/*SERVER_REQUEST_CODE*/", serverRequestCode);
  return serverTemplateCode;
};

function generateAppCode(files) {
  let appServerInitCode = "";
  let appServerRequestCode = "";
  let appBrowserCode = "";
  for (const file of files) {
    const componentName = `$${file.path.replace(`/`, `_`).replace(`.`, `$`)}`;
    appBrowserCode += `const ${componentName} = function($props) {`;
    const {serverInitCode, serverRequestCode, browserCode} = internalCompile(block, file.contents);
    appServerInitCode += serverInitCode;
    appServerRequestCode += serverRequestCode;
    appBrowserCode += browserCode;
    appBrowserCode += `};`;
  }
  return {serverInitCode: appServerInitCode, serverRequestCode: appServerRequestCode, browserCode: appBrowserCode};
}

function internalCompile(compiler, passedInput) {
  input = (passedInput || "").trim();
  eatenInput = "";
  serverInitCode = "";
  serverRequestCode = "";
  let isRequired = true;
  let errors = [];
  capturedItems = [];
  function error(message) {
    errors.push({location: eatenInput.length, message});
  }
  function eof() {
    return input.length === 0;
  }
  function advance(count) {
    const eaten = input.substring(0, count);
    input = input.substring(count);
    eatenInput += eaten;
  }
  function save() {
    const data = {input, eatenInput, serverInitCode, serverRequestCode, isRequired, errors: errors ? [...errors] : errors, capturedItems: capturedItems ? [...capturedItems] : capturedItems, makeData};
    return {
      restore: () => {
        input = data.input;
        eatenInput = data.eatenInput;
        serverInitCode = data.serverInitCode;
        serverRequestCode = data.serverRequestCode;
        capturedItems = data.capturedItems;
        isRequired = data.isRequired;
        errors = data.errors;
        makeData = data.makeData;
      }
    };
  }
  function capture(str) {
    if (capturedItems) {
      const value = input.substring(0, str.length);
      capturedItems.push(value);
    }
  }
  function processCompiler(compiler) {
    let savedMakeData, savedCapturedItems, result, startLength = eatenInput.length;
    logInput(`==> ${eatenInput}[~]${input}`);
    init();
    if (compiler === ws) {
      result = processCompiler(opt(ws()));
    } else if (typeof compiler === "function") {
      const value = compiler();
      result = processCompiler(value);
    } else if (compiler.type === "pattern") {
      console.log("[pattern]");
      let allMatch = true;
      const bookmark = save();
      for (const child of compiler.children) {
        const result = processCompiler(child);
        if (!result) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) {
        compiler.madeFailed = true;
        bookmark.restore();
      }
      result = allMatch;
    } else if (typeof compiler === "string") {
      if (input.startsWith(compiler)) {
        capture(compiler.length);
        advance(compiler.length);
        result = true;
      } else {
        if (isRequired) error(`Expected "${compiler}"`);
        result = false;
      }
    } else if (compiler.type === "identifier" || compiler.type === "identifierWithDashes") {
      const regex = identifierWithDashes ? /[a-zA-Z][-_a-zA-Z]*|[_][-a-zA-Z]+/ : /[a-zA-Z][_a-zA-Z]*|[_][a-zA-Z]+/;
      const match = input.match(regex);
      if (match) {
        capture(match[0]);
        advance(match[0].length);
        result = true;
      } else {
        result = false;
      }
    } else if (compiler.type === "ws") {
      const amount = compiler.minCount ? `{${compiler.minCount}}\\s*` : `*`;
      const regex = `\\s${amount}`;
      const match = input.match(new RegExp(regex));
      if (match[0]?.length > 0) {
        advance(match[0].length);
        result = true;
      } else {
        result = false;
      }
    } else if (compiler.type === "any") {
      let matchFound = false;
      const bookmark = save();
      for (const child of compiler.values) {
        const result = processCompiler(child);
        if (result) {
          matchFound = true;
          break;
        }
      }
      if (!matchFound) bookmark.restore();
      result = matchFound;
    } else if (compiler.type === "opt") {
      processCompiler(compiler.value);
      result = true;
    } else if (compiler.type === "supressError") {
      const savedIsRequired = isRequired;
      isRequired = false;
      result = processCompiler(compiler.value);
      isRequired = savedIsRequired;
    } else if (compiler.type === "rollback") {
      const bookmark = save();
      result = processCompiler(compiler.value);
      bookmark.restore();
    } else if (compiler.type === "not") {
      result = !processCompiler(compiler.value);
    } else if (compiler.type === "whilst") {
      console.log(`[whilst ${toString(compiler.conditionFn)}]`);
      let loopCount = 0;
      while (!eof()) {
        let delimiterFailed = false;
        if (loopCount > 0 && compiler.delimiter) {
          const delimiterResult = processCompiler(rollback(compiler.delimiter));
          delimiterFailed = !delimiterResult;
        }
        const savedEatenInput = eatenInput;
        const conditionResult = processCompiler(rollback(compiler.conditionFn));
        if (!conditionResult) break;
        loopCount++;
        console.log(`> loop ${loopCount}`);
        processCompiler(compiler.actionFn);
        if (eatenInput === savedEatenInput) {
          console.error(`Infinite loop at:`);
          console.error(`==> ` + eatenInput);
          console.error(`On rule:`);
          console.error(`==> when(${JSON.stringify(conditionCompiler)}) {\n${JSON.stringify(childCompiler)}}`);
          throw new Error("Infinite loop");
        }
      }
      result = true;
    } else if (compiler.type === `when`) {
      for (const branch of compiler.branches) {
        if (eof()) break;
        let conditionResult = true;
        if (branch.conditionFn) {
          conditionResult = processCompiler(branch.conditionFn);
        }
        if (conditionResult) {
          processCompiler(branch.actionFn);
          break;
        }
      }
      result = true;
    } else if (compiler.type === `unescaped`) {
      if (eatenInput.endsWith(`\\`)) return false;
      result = processCompiler(compiler.value);
    } else if (compiler.type === "eatUntil") {
      let value = "";
      while (!eof()) {
        const result = processCompiler(rollback(compiler.value));
        if (result) {
          break;
        }
        value += input.substring(0, 1);
        advance(1);
      }
      capturedItems.push(value);
      result = true;
    }
    finish();
    return result;
    function init() {
      const name = compiler.asName || compiler.asListName;
      if (name || compiler.makeFn) {
        savedCapturedItems = capturedItems;
        savedMakeData = makeData;
        if (name) {
          capturedItems = [];
          makeData = null;
        } else {
          capturedItems = null;
          makeData = {};
        }
      }
    }
    function finish() {
      const name = compiler.asName || compiler.asListName;
      if (name || compiler.makeFn) {
        const myMakeData = makeData;
        if (myMakeData) {
          myMakeData.input = eatenInput.substring(eatenInput.length - startLength);
        }
        const myCapturedItems = capturedItems;
        makeData = savedMakeData;
        capturedItems = savedCapturedItems;
        if (name) {
          if (!compiler.asListName && myCapturedItems.length > 1) throw new Error(`expected 1 captured item`);
          if (compiler.asListName) {
            let list = makeData[name];
            if (!list) {
              list = [];
              makeData[name] = list;
            }
            myCapturedItems.forEach(x => list.push(x));
          } else {
            makeData[name] = myCapturedItems[0];
          }
        } else if (compiler.makeFn) {
          if (!compiler.madeFailed) {
            let madeList = compiler.makeFn(myMakeData);
            let nonStringExist = true;
            while (nonStringExist) {
              nonStringExist = false;
              const newList = [];
              for (const item of madeList) {
                if (typeof item === `string`) {
                  newList.push(item);
                } else {
                  nonStringExist = true;
                  if (typeof item !== `function`) {
                    throw new Error(`Non-string, non-function in make list`);
                  } else {
                    const newItem = item();
                    if (newItem) newList.push(newItem);
                  }
                }
              }
              madeList = newList;
            }
            const madeString = madeList.join("").trim();
            capturedItems.push(madeString);
          }
        }
      }
    }
  };
  processCompiler(compiler);
  return {serverInitCode, serverRequestCode, browserCode: capturedItems[0] || ``};
}

function copy(obj, extraProperties = {}) {
  return {...obj, ...extraProperties};
}

function toString(valueToConvert) {
  if (valueToConvert === undefined || valueToConvert === null) {
      return valueToConvert === undefined ? "undefined" : "null";
  }
  if (typeof valueToConvert === "string") {
      return `'${valueToConvert}'`;
  }
  if (typeof valueToConvert === "function") {
      return toString(valueToConvert());
  }
  if (typeof valueToConvert === "number" ||
      typeof valueToConvert === "boolean") {
      return valueToConvert.toString();
  }
  if (valueToConvert instanceof Array) {
      const stringfiedArray = valueToConvert
          .map(property => toString(property))
          .join(",");
      return `[${stringfiedArray}]`;
  }
  if (typeof valueToConvert === "object") {
      const stringfiedObject = Object.entries(valueToConvert)
          .map((entry) => {
          return `${entry[0]}: ${toString(entry[1])}`;
      })
          .join(",");
      return `{${stringfiedObject}}`;
  }
  return JSON.stringify(valueToConvert);
}

function logInput(passedInput) {
  if (passedInput !== lastLoggedInput) {
    console.log(passedInput);
    lastLoggedInput = passedInput;
  }
}

module.exports = {compile, internalCompile, tag};