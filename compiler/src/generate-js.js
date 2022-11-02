const createParser = require(`./create-parser`);

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z_0-9]*/;
const HEAD_COMPONENT = `~~HEAD~~`;

const jsKeywordsToEscape = [
  `delete`
];

module.exports = (file, files) => {
  const isMainFile = file.path === `main.bs`;
  const {title} = generateFile(file, isMainFile, files);
  return {title};
};

function generateFile(file, isMainFile, files) {
  const parser = createParser(file.tokens);
  const eof = parser.eof.bind(parser);
  const is = parser.is.bind(parser);
  const isValue = parser.isValue.bind(parser);
  const isAhead = parser.isAhead.bind(parser);
  const skip = parser.skip.bind(parser);
  const eat = parser.eat.bind(parser);
  const eatValue = parser.eatValue.bind(parser);
  const eatRequired = parser.eatRequired.bind(parser);
  const eatValueRequired = parser.eatValueRequired.bind(parser);
  const skipRequired = parser.skipRequired.bind(parser);
  const asString = parser.asString.bind(parser);

  let isComponentFile = false;
  let defaultMode = `browser`;
  let defaultComponent = `main.bs`;
  let defaultComponentPart = `template`;
  let browserComponentCode = {};
  let browserHeadCode = ``;
  let browserInitCode = ``;
  let serverCode = ``;
  let serverInitCode = ``;
  let databaseCode = ``;
  const defaultBrowserComponentAppender = str => browserComponentCode[defaultComponent][defaultComponentPart] += str;
  const defaultBrowserInitAppender = str => browserInitCode += str;
  let defaultAppender = defaultBrowserInitAppender;

  let fileTitle;
  if (is(`identifier`) && isValue(`component`)) {
    isComponent = true;
    skip(); // component
    if (isMainFile) {
      const titleAppender = str => fileTitle = str.replaceAll(`"`, ``);
      withAppender(titleAppender, () => {
        generateStringExpression();
        skip(); // statementend
      });
    }
    defaultAppender = defaultBrowserComponentAppender;
  }
  generateBlockContents();
  let browserCode = ``;
  if (isComponent) {
    browserCode = `
      app.component("bs-component-${file.path.replaceAll(`/`, `--`).replaceAll(`.`, `-`)}", {
        template: "${browserComponentCode[`template`].replaceAll(`"`, `\\"`)}",
        data() {
            return {
                ${browserComponentCode[`data`]}
            };
        },
        computed: {
            ${browserComponentCode[`computed`]}
        },
        methods: {
            ${browserComponentCode[`methods`]}
        }
      });
    `
  } else {
    browserCode = `
      $bs.modules.["${file.path.replaceAll(`"`, `\\"`)}"] = () => {
        ${browserInitCode}
      };
    `;
  }
  return {fileTitle, browserCode, serverCode, serverInitCode, databaseCode};

  function generateBlockContents(...terminators) {
    parser;
    let terminated = false;
    while (!eof() && !terminated) {
      generateStatement();
      // statementCode.prependIfExists(`browser`, `$ => `);
      // statementCode.prependIfExists(`server`, `$ => `);
      // statementCode.prependIfExists(`serverInit`, `$ => `);
      // statementCode.appendIfExists(`browser`, `,`);
      // statementCode.appendIfExists(`server`, `,`);
      // statementCode.appendIfExists(`serverInit`, `,`);
      // blockCode.append(statementCode);
      if (!is(`statementend`)) {
        die(`expected statement end`);
      }
      if (terminators.some(x => is(x))) {
        terminated = true;
        break;
      }
      skip(); // `statementend`
      if (terminators.some(x => is(x))) terminated = true;
    }

    // function buildBlock(blockCode, type) {
    //   const blockVars = blockCode[`${type}BlockVars`];
    //   if (!blockCode[type] && blockVars.length === 0) return;
    //   blockCode[type] = `
    //     ${isComponent ? `return bs.children($children => {` : ``}
    //     ${blockVars.length > 0 ? `let ${blockVars.join(`,`)};` : ``}
    //     ${!isComponent ? `return ` : ``}bs.pipe($,
    //     ${blockCode[type]}
    //     )
    //     ${isComponent ? `});` : ``}
    //   `
    // }

    // buildBlock(blockCode, `browser`);
    // buildBlock(blockCode, `server`);
    // buildBlock(blockCode, `serverInit`);
    return blockCode;
  }

  function generateBlock() {
    let result;
    if (is(`blockstart`)) {
      skip(); // blockstart
      withComponentStatus(false, () => {
        result = generateBlockContents(`blockend`);
      });
      skip(); // blockend
    } else {
      withComponentStatus(false, () => {
        result = generateBlockContents(`statementend`, `blockend`);
      });
    }
    return result;
  }

  function generateStatement() {
    parser;
    if (isValue(`state`)) {
      return generateStateDeclaration();
    } else if (is(`colon`)) {
      return generateTagInstantiation();
    } else if (is(`identifier`)) {
      if (isValue(`fn`)) {
        return generateFunctionDeclaration();
      } else if (isValue(`for`)) {
        return generateForLoopStatement();
      } else if (isValue(`style`)) {
        return generateStyleStatement();
      } else {
        return generateExpressionBasedStatement();
      }
    } else if (is(`stringstart`)) {
      return generateExpressionBasedStatement();
    }
    die(`could not make statement`);
  }

  function generateStyleStatement() {
    skipRequired(`identifier`); // style
    if (isValue(`url`)) {
      skip(); // url
      defaultToBrowserHtmlHeader(() => {
        code(`<link rel="stylesheet" href="`);
        generateStringExpression();
        code(`"/>`);
      });
    } else if (is(`dot`) && isAhead(`slash`)) {
      skip(); // dot
      skip(); // slash
      generateFileContents();
      //!!!!!!!!!!!! replace tokens with copy of tokens from imported file?
    } else if (is(`stringstart`)) {

    } else {
      die(`expected url, file reference or string`);
    }
  }

  function generateForLoopStatement() {
    skipRequired(`identifier`); // for
    skipRequired(`parenstart`);
    const nameExpression = generateParam();
    skipRequired(`identifier`); // in
    const collectionExpression = generateExpression();
    skipRequired(`parenend`);
    const body = generateBlock();

    return defaultCode(`bs.for(`,
      `$, `, collectionExpression, `, $children,`,
      `($children,`, nameExpression, `) => {`,
        body,
        // ...(
        //   isComponent ? [`
        //     `(()=>{`, body, `})();`,
        //     `return $children;
        //   `]
        //   : [body]
        // ),
      `}`,
    `)`);
  }

  function generateExpressionBasedStatement() {
    const expressionAst = parseExpression();
    if (is(`plus`) && isAhead(`equals`)) {
      return generateAppendStatement(writeExpression(expressionAst));
    } else if (is(`equals`)) {
      return generateAssignmentStatement(expressionAst);
    } else {
      const expression = writeExpression(expressionAst);
      return expression;
    }
  }

  function generateAssignmentStatement(nameExpressionAst) {
    const nameValue = nameExpressionAst.value;
    const memberCallExpressions = nameExpressionAst.memberCallExpressions;
    const isSimpleVar = memberCallExpressions.length === 0
        && IDENTIFIER.test(nameValue);
    skipRequired(`equals`);
    const valueExpression = generateExpression();

    if (isSimpleVar) {
      return defaultCode(`$state_${nameValue}.assign(`, valueExpression, `)`);
    } else {
      const allButLast = memberCallExpressions.slice(0, memberCallExpressions.length - 1);
      const allExpressionsButLast = writeExpression({value: nameValue, memberCallExpressions: allButLast});
      const last = memberCallExpressions[memberCallExpressions.length - 1].value;
      return defaultCode(allExpressionsButLast, `.$set("${last}",`, valueExpression, `)`);
    }
  }

  function generateAppendStatement(subject) {
    skipRequired(`plus`);
    skipRequired(`equals`);
    const expression = generateExpression();

    return defaultCode(`bs.append(`, subject, `,`, expression, `)`);
  }

  function generateStateDeclaration() {
    if (defaultMode !== Mode.BROWSER) throw new Error(defaultMode);
    skip(); // `state`
    const name = eatValue();
    skip(); // `=`
    const expression = generateExpression();

    return browserCode(
      `$state_${name} = bs.state("${name}", $ => ${name} = $, `, expression, `)`,
      [name, `$state_${name}`]
    );
  }

  function generateTagInstantiation() {
    if (defaultMode !== Mode.BROWSER) throw new Error(defaultMode);
    skip(); // `:`
    let defaultStringExpression = null;
    let tagType = null;
    if (is(`stringstart`)) {
      defaultStringExpression = generateStringExpression();
      tagType = `span`;
    } else {
      tagType = eatValue();
    }
    const {unnamedExpressions, namedExpressions} = parseTagInstantiationProps();
    if (defaultStringExpression) {
      unnamedExpressions.append(defaultStringExpression);
    }
    let children = "";
    if (is(`blockstart`)) {
      skip();
      children = generateBlockContents(`blockend`);
      skip(); // `blockend`
    }

    return browserCode(`{
      $children.push(bs.tag("${tagType}",[`, unnamedExpressions, `],{`, namedExpressions, `}`, ...(children ? [`,`, `((() => {const $children = [];(()=>{`, children, `})();return $children;})())`] : []), `));
    }`);
  }

  function parseTagInstantiationProps() {
    if (defaultMode !== Mode.BROWSER) throw new Error(defaultMode);
    let unnamedExpressions = code();
    let namedExpressions = code();
    let first = true;
    while (!is(`statementend`) && !is(`blockstart`) && !is(`blockend`)) {
      if (first) first = false;
      else skipRequired(`comma`);
      let name;
      if (is(`identifier`) && isAhead(`colon`)) {
        name = eatValue(`identifier`);
        skipRequired(`colon`);
      }
      let isTwoWayBinding = false;
      if (is(`asterisk`)) {
        skip(); // `*`
        isTwoWayBinding = true;
      }
      const isSimpleVarRef = is(`identifier`) && !(isAhead(`dot`) || isAhead(`parenstart`) || isAhead(`bracketstart`));
      const value = generateExpression();
      if (isTwoWayBinding) {
        let assignmentStr = code();
        if (isSimpleVarRef) {
          assignmentStr.append(browserCode(`$state_`, value, `.assign($v)`));
        } else { // simple variable ref
          assignmentStr.append(browserCode(value, `=$v`));
        }
        if (name) {
          namedExpressions.append(browserCode(`${name}:`, value, `,on${name}Change:$v => `, assignmentStr, `,`));
        } else {
          unnamedExpressions.append(browserCode(value, `,$v => `, assignmentStr, `,`));
        }
      } else {
        if (name) {
          namedExpressions.append(browserCode(`${name}:`, value, `,`));
        } else {
          unnamedExpressions.append(browserCode(value, `,`));
        }
      }
    }
    return {unnamedExpressions, namedExpressions};
  }

  function generateFunctionDeclaration() {
    if (!is(`identifier`) || !isValue(`fn`)) die(`expected "fn"`);
    skip(); // `fn`
    const name = escapeJsKeywords(eatValueRequired(`identifier`));
    const expression = generateFunctionExpression();
    
    return defaultCode(`${name} = `, expression, [name]);
  }

  function parseExpression() {
    const value = generateExpressionValue();
    let memberCallExpressions = [];
    while (true) {
      if (is(`dot`)) {
        skip(); // `.`
        const prop = eatValueRequired(`identifier`);
        memberCallExpressions.push({type: `member`, value: prop});
      } else if (is(`parenstart`)) {
        memberCallExpressions.push({type: `paren`, value: generateParenExpression()});
      } else if (is(`bracketstart`)) {
        memberCallExpressions.push({type: `list`, value: generateListExpression()});
      } else {
        break;
      }
      first = false;
    }

    return {value, memberCallExpressions};
  }

  function generateExpression() {
    const expressionAst = parseExpression();
    return writeExpression(expressionAst);
  }

  function writeExpression(expressionAst) {
    let memberCallExpressions = [];
    for (const memberCallExpressionAst of expressionAst.memberCallExpressions) {
      if (memberCallExpressionAst.type === `member`) {
        memberCallExpressions.push(defaultCode(`.$get("${memberCallExpressionAst.value}")`));
      } else if (memberCallExpressionAst.type === `paren`) {
        memberCallExpressions.push(memberCallExpressionAst.value);
      } else if (memberCallExpressionAst.type === `list`) {
        memberCallExpressions.push(memberCallExpressionAst.value);
      } else {
        break;
      }
      first = false;
    }

    return defaultCode(expressionAst.value, ...memberCallExpressions);
  }

  function generateFunctionExpression(paramExpression = `()`) {
    if (is(`parenstart`)) {
      if (paramExpression !== `()`) die(`expected hyphen`);
      paramExpression = generateParameterList()
    }
    skipRequired(`dash`);
    skipRequired(`greaterthan`);
    const fnBody = generateBlock();

    return defaultCode(paramExpression, `=>{`, fnBody, `}`);
  }

  function generateParam() {
    const name = eatValueRequired(`identifier`); // TODO support destructuring, etc

    return defaultCode(name);
  }

  function generateParameterList() {
    const params = [];
    skipRequired(`parenstart`);
    let first = true;
    while (!eof() && !is(`parenend`)) {
      if (first) {
        first = false;
      } else {
        skipRequired(`comma`);
        params.push(`,`);
      }
      const param = generateParam();
      params.push(param);
    }
    skipRequired(`parenend`);

    return defaultCode(`(`, ...params, `)`);
  }
  
  function generateExpressionValue() {
    if (is(`stringstart`)) {
      return generateStringExpression();
    } else if (is(`bracketstart`)) {
      return generateListExpression();
    } else if (is(`identifier`)) {
      if (isValue(`style`)) {
        return generateStyleExpression();
      } else if (isAhead(`dash`) && isAhead(`greaterthan`, 2)) {
        const argName = eatValue();
        return generateFunctionExpression(argName);
      } else if (isValue(`if`)) {
        return generateIfExpression();
      }
      return escapeJsKeywords(eatValue());
    } else if (is(`dash`)) {
      if (isAhead(`greaterthan`)) {
        return generateFunctionExpression();
      }
    } else if (is(`parenstart`)) {
      return generatedParenBasedExpression();
    } else if (is(`curlystart`)) {
      return generatedObjectExpression();
    }
    throw new Error(`expected expression value`);
  }

  function generateIfExpression() {
    skipRequired(`identifier`); // if
    skipRequired(`parenstart`);
    const pieces = [];
    const condition = generateExpression();
    pieces.push(condition);
    skipRequired(`parenend`);
    pieces.push(`,$=>{`);
    const body = generateBlock();
    pieces.push(body);
    pieces.push(`}`);
    let hasElse = is(`identifier`) && isValue(`else`);
    while (is(`identifier`) && isValue(`else`)) {
      skip(); // else
      if (is(`identifier`) && isValue(`if`)) {
        skip(); // if
        skipRequired(`parenstart`);
        const elseCondition = generateExpression();
        pieces.push(`,()=>`);
        pieces.push(elseCondition);
        skipRequired(`parenend`);
      }
      const elseBody = generateBlock();
      pieces.push(`,$=>{`);
      pieces.push(elseBody);
      pieces.push(`}`);
    }

    return defaultCode(`bs.if($,()=>`, ...pieces, `)`);
  }

  function generateStyleExpression() {
    if (defaultMode !== Mode.BROWSER) throw new Error(defaultMode);
    skipRequired(`identifier`); // style keyword
    const styleString = generateStringExpression();

    return defaultCode(`({style:${JSON.stringify(convertCssToJson(styleString.browser))}})`);
  }

  function convertCssToJson(css) {
    let newCss = ``;
    while (true) {
      let colonIndex = css.indexOf(`:`);
      let semicolonIndex = css.indexOf(`;`);
      if (colonIndex === -1 && semicolonIndex === -1) break;
      if (colonIndex === -1) colonIndex = Number.MAX_VALUE;
      if (semicolonIndex === -1) semicolonIndex = Number.MAX_VALUE;
      const nextIndex = Math.min(colonIndex, semicolonIndex);
      const separator = nextIndex === colonIndex ? `:` : `;`;
      newCss += `${css.substring(0, nextIndex)}"${separator}"`;
      css = css.substring(nextIndex + 1);
    }
    newCss += css;
    const cssObj = JSON.parse(`{${newCss}}`);
    const newCssObj = {};
    for (const [key, value] of Object.entries(cssObj)) {
      let newKey = ``;
      let wasDash = false;
      for (const c of key.split("")) {
        if (c === `-`) {
          wasDash = true;
        } else {
          if (wasDash) {
            newKey += c.toUpperCase();
            wasDash = false;
          } else {
            newKey += c;
          }
        }
      }
      newCssObj[newKey] = value;
    }
    return newCssObj;
  }

  function generatedObjectExpression() {
    skipRequired(`curlystart`);
    let first = true;
    const result = defaultCode(`bs.obj({`);
    while (!eof() && (first || is(`comma`))) {
      let prop = ``;
      if (first) {
        first = false;
      } else {
        skip(); // comma
        prop += `,`;
      }
      const name = eatValueRequired(`identifier`);
      skipRequired(`colon`);
      prop += `${name}:`;
      const value = generateExpression();

      result.append(defaultCode(prop, value));
    }
    skipRequired(`curlyend`);
    result.append(defaultCode(`})`));

    return result;
  }

  function generatedParenBasedExpression() {
    const parenExpression = generateParenExpression();
    if (is(`dash`) && isAhead(`greaterthan`)) {
      return generateFunctionExpression(parenExpression);
    }
  }

  function generateStringExpression() {
    js(`"`);
    skip(); // `"`
    while (!eof() && (is(`stringliteral`) || is(`stringcodeblockstart`))) {
      if (is(`stringliteral`)) {
        const value = eatValue();
        js(value);
      } else {
        js(`"+(`);
        skip(); // stringcodeblockstart
        generateExpression();
        js(`}+"`);
        skip(); // stringcodeblockend
      }
    }
    js(`"`);
    skip(); // `"`
  }

  function generateListExpression() {
    const expressions = [];
    skip(); // `[`
    let first = true;
    while (!eof() && !is(`bracketend`)) {
      if (!first) {
        if (!is(`comma`)) throw new Error(`expecting comma`);
        skip();
        first = true;
      }
      generateExpression();
    }
    skip(); // `]`

    return `bs.arr(${expressions.join(",")})`;
  }

  function generateParenExpression() {
    const expressions = [];
    skip(); // `(`
    let first = true;
    while (!eof() && !is(`parenend`)) {
      if (first) {
        first = false;
      } else {
        if (!is(`comma`)) throw new Error(`expecting comma`);
        skip();
        expressions.push(`,`);
      }
      const expression = generateExpression();
      expressions.push(expression);
    }
    skip(); // `)`

    return defaultCode(`(`, ...expressions, `)`);
  }

  function defaultToBrowser() {

  }

  function js(code) {
    if (!defaultMode) throw new Error(`default mode required`);
    if (!defaultComponent) throw new Error(`default component required`);
    if (!defaultComponentPart) throw new Error(`default component part required`);
    if (defaultMode === `browser`) {
      return vueJs(defaultComponent, defaultComponentPart, code);
    } else if (defaultMode === `browserhead`) {
      return browserHeadJs(code);
    } else if (defaultMode === `browserinit`) {
      return browserInitJs(code);
    } else if (defaultMode === `server`) {
      return serverJs(code);
    } else if (defaultMode === `serverinit`) {
      return serverInitJs(code);
    } else if (defaultMode === `database`) {
      return databaseJs(code);
    }
  }

  function browserJs(component, part, code) {
    let componentObj = browserComponentCode[component];
    if (!componentObj) {
      componentObj = {};
      browserComponentCode[component] = componentObj;
    }
    componentObj[part] = (componentObj[part] || ``) + code;
  }

  function browserHeadJs(code) {
    browserHeadCode += code;
  }

  function browserInitJs(code) {
    browserInitCode += code;
  }

  function serverJs(code) {
    serverCode += code;
  }

  function serverInitJs(code) {
    serverInitCode += code;
  }

  function databaseJs(code) {
    databaseCode += code;
  }

  function defaultComponentCode(...values) {

  }

  function defaultCode(...values) {
    return code(defaultMode, null, ...values);
  }

  function code(mode, component, ...values) {
    const myCode = {
      browser: {},
      server: ``,
      serverInit: ``,
      database: ``,
      add: function(value) {
        if (typeof value === `string`) {
          if (mode === `browser`) {
            myCode.browser[component] += str;
          } else {
            myCode[mode] += str;
          }
        } else {
          myCode.append(value);
        }
        this.browser += otherCode.browser;
        this.server += otherCode.server;
        this.serverInit += otherCode.serverInit;
        this.database += otherCode.database;
      },
      prependIfExists: function(type, str) {
        const existingValue = this[type];
        if (existingValue) this[type] = str + existingValue;
      },
      appendIfExists: function(type, str) {
        const existingValue = this[type];
        if (existingValue) this[type] = existingValue + str;
      }
    };
    for (let value of values) {
      
    }
  }

  function defaultCode(...args) {
    return buildCode(defaultMode, args);
  }

  // function browserCode(...args) {
  //   return buildCode(Mode.BROWSER, args);
  // }

  // function serverCode(...args) {
  //   return buildCode(Mode.SERVER, args);
  // }

  // function serverInitCode(...args) {
  //   return buildCode(Mode.SERVER_INIT, args);
  // }

  // function databaseCode(...args) {
  //   return buildCode(Mode.DATABASE, args);
  // }

  function buildCode(mode, values) {
    const myCode = code();
    for (let value of values) {
      if (typeof value === `string`) {
        myCode[mode] += value;
      } else if (Array.isArray(value)) {
        pushAll(myCode[`${mode}BlockVars`], value);
      } else {
        myCode.append(value);
      }
    }
    return myCode;
  }

  function withComponentStatus(newIsComponent, fn) {
    const savedIsComponent = isComponent;
    isComponent = newIsComponent;
    const result = fn();
    isComponent = savedIsComponent;
    return result;
  }

  function whileDelimited(delimiter, blockFn) {
    return whileFirstOr(is(delimiter), blockFn);
  }

  function whileFirstOr(predicateFn, blockFn) {
    let first = true;
    while (!eof() && (first || predicateFn())) {
      first = false;
      blockFn();
    }
  }

  function withAppender(newAppender, fn) {
    const savedAppender = defaultAppender;
    defaultAppender = newAppender;
    fn();
    defaultAppender = savedAppender;
  }

  function pushAll(arr, items) {
    for (let item of items) {
      arr.push(item);
    }
  }

  function die(msg) {
    throw {msg, position: parser.eatenInput[parser.eatenInput.length - 1]?.position || 0, type: `PARSING`};
  }

  function escapeJsKeywords(value) {
    if (!value) return value;
    if (jsKeywordsToEscape.includes(value)) return `$_${value}`;
    else return value;
  }
};