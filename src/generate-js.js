const createParser = require(`./create-parser`);
const lex = require("./lex");

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z_0-9]*/;

const jsKeywordsToEscape = [
  `delete`
];

module.exports = (file, files) => {
  return generateFile(file, files);
};

function generateFile(file, files) {
  if (file.js) return;
  const isMainFile = file.name === `main.bs`;
  const parser = createParser(file.tokens, file);
  const eof = parser.eof.bind(parser);
  const is = parser.is.bind(parser);
  const isValue = parser.isValue.bind(parser);
  const isAhead = parser.isAhead.bind(parser);
  const isAheadValue = parser.isAheadValue.bind(parser);
  const skip = parser.skip.bind(parser);
  const eat = parser.eat.bind(parser);
  const eatValue = parser.eatValue.bind(parser);
  const eatRequired = parser.eatRequired.bind(parser);
  const eatValueRequired = parser.eatValueRequired.bind(parser);
  const skipRequired = parser.skipRequired.bind(parser);
  const asString = parser.asString.bind(parser);
  const getValue = parser.getValue.bind(parser);

  let defaultMode = `browser`;
  let browserComponentCode = ``;
  let browserHeadCode = ``;
  let mainCode = ``;
  let serverCode = ``;
  let serverInitCode = ``;
  let databaseCode = ``;
  let declaredVariableNames = [];
  let isComponent = file.isComponent;
  const scopeIds = [0];
  const defaultBrowserComponentAppender = str => {
    browserComponentCode += str;
  };
  const defaultMainAppender = str => mainCode += str;
  let defaultAppender = defaultMainAppender;

  let browserTitle = ``;
  if (is(`pound`)) {
    skip(); // #
    if (isValue(`application`)) {
      skip(); // application
      while (!eof() && !is(`statementend`)) skip();
      if (!eof()) skip(); // statementend
    }
  }
  if (is(`pound`)) {
    skip(); // #
    if (isValue(`component`)) {
      skip(); // component
      isComponent = true;
      if (isMainFile) file.appType = `component`;
      while (!eof() && !is(`statementend`)) skip();
      if (!eof()) skip(); // statementend
    } else {
      die(`unexpected header type`);
    }
  }
  if (isComponent) {
    defaultAppender = defaultBrowserComponentAppender;
  }
  generateBlockContents();
  const escapedPath = file.path.replaceAll(`"`, `\\"`);
  if (browserComponentCode) {
    mainCode += `
      _topLevelComponents["${escapedPath}"] = _component((_state) => {
        ${browserComponentCode}
      });
    `
  } else {
    mainCode = `
      _declareFile("${file.moduleName}", "${file.modulePath}", () => {
        ${mainCode}
      });
    `;
  }
  file.js = {browserTitle, browserHeadCode, mainCode, serverCode, serverInitCode, databaseCode};

  function generateBlockContents(...terminators) {
    parser;
    let terminated = false;
    const savedDeclaredVariableNames = declaredVariableNames;
    declaredVariableNames = [];
    const blockCode = capture(() => {
      while (!eof() && !terminated) {
        if (!isComponent) {
          js(`() =>`);
        }
        generateStatement();
        if (!is(`statementend`)) {
          die(`expected statement end`);
        }
        skip(); // `statementend`
        if (isComponent) {
          js(`;\n`);
        } else {
          js(`,\n`);
        }
        if (terminators.some(x => is(x))) terminated = true;
      }
    });
    if (declaredVariableNames.length > 0) {
      js(`let ${declaredVariableNames.join(`,`)};\n`);
    }
    if (!isComponent) {
      js(`return _pipe(`);
    }
    js(blockCode);
    if (!isComponent) {
      js(`);`);
    }
    declaredVariableNames = savedDeclaredVariableNames;
  }

  function generateBlock() {
    if (is(`blockstart`)) {
      skip(); // blockstart
      withComponentStatus(false, () => {
        generateBlockContents(`blockend`);
      });
      skip(); // blockend
    } else {
      withComponentStatus(false, () => {
        generateBlockContents(`statementend`, `blockend`);
      });
    }
  }

  function generateStatement() {
    parser;
    if (isValue(`state`)) {
      generateStateDeclaration();
    } else if (is(`colon`)) {
      generateTagInstantiation();
    } else if (is(`identifier`)) {
      if (isValue(`fn`)) {
        return generateFunctionDeclaration();
      } else if (isValue(`for`)) {
        return generateForLoopStatement();
      } else if (isValue(`style`)) {
        return generateStyleStatement();
      } else if (isValue(`var`)) {
        return generateVariableDeclaration();
      } else {
        generateExpressionBasedStatement();
      }
    } else if (is(`stringstart`)) {
      return generateExpressionBasedStatement();
    } else {
      die(`could not make statement`);
    }
  }

  function generateVariableDeclaration() {
    skipRequired(`identifier`); // var
    let varNameExpression = ``;
    let done = false;
    let destructLayerCount = -1; // -1{0,{1}} index of destruct layer
    while (!done) {
      if (is(`identifier`)) {
        const value = eat()?.value
        varNameExpression += value;
        if (destructLayerCount < 1) {
          // {weAreHere, {notHere}}
          declaredVariableNames.push(value);
        }
      } else if (is(`curlystart`)) {
        skip();
        varNameExpression += `{`;
        destructLayerCount++;
      } else if (is(`curlyend`)) {
        skip();
        varNameExpression += `}`;
        destructLayerCount--;
      } else if (is(`colon`)) {
        skip();
        varNameExpression += `:`;
      } else if (is(`comma`)) {
        skip();
        varNameExpression += `,`;
      } else {
        done = true;
      }
    }
    let initializer = ``;
    if (is(`equals`)) {
      skip(); // =
      initializer = capture(generateExpression);
    }
    if (isComponent) {
      if (initializer) {
        js(`${varNameExpression}${initializer ? ` = ${initializer}` : ``}`);
      }
    } else {
      if (initializer) {
        js(`_pipe(() => ${initializer}, _value => (${varNameExpression} = _value))\n`);
      }
    }
    
  }

  function generateStyleStatement() {
    throw new Error("implement me!");
    // skipRequired(`identifier`); // style
    // if (isValue(`import`)) {
    //   skip(); // import
    //   if (isValue(`url`)) {
    //     skip(); // url
    //     defaultToBrowserHead(() => {
    //       code(`<link rel="stylesheet" href="`);
    //       generateStringExpression();
    //       code(`"/>`);
    //     });
    //   } else if (is(`modulereference`)) {
    //     const importPath = eatValue();
    //     const importedFile = importFile(importPath);
    //     if (importedFile.isComponent) {
    //       js(importedFile.componentId);
    //     } else {
    //       js(`$bs.mod("${importedFile.id}")`);
    //     }
    //   }
    // } else {
      
    // }
    //  else if (is(`stringstart`)) {
    //   throw new Error(`implement me!`);
    // } else if (is(`pound`)) {
    //   skip(); // pound
    //   const name = eatRequired(`identifier`);
    //   throw new Error(`implement me!`);
    // } else {
    //   die(`expected url, file reference or string`);
    // }
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
    if (is(`plus`)) {
      const expressionCode = capture(() => writeExpression(expressionAst));
      if (isAhead(`equals`)) {
        generateAppendStatement(expressionCode);
      }
    } else if (is(`equals`)) {
      return generateAssignmentStatement(expressionAst);
    } else {
      if (isComponent) {
        const expressionCode = capture(() => writeExpression(expressionAst));
        writeTagInstantiation(`span`, [expressionCode]);
      } else {
        writeExpression(expressionAst);
      }
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
    const expression = capture(generateExpression);
    const isAssignment = IDENTIFIER.test(subject);
    js(`_append(${subject},${expression},_v => ${isAssignment ? `_state_${subject}.assign(_v)` : `${subject} = _v`})`);
  }

  function generateStateDeclaration() {
    // if (defaultMode !== Mode.BROWSER) throw new Error(defaultMode);
    skip(); // `state`
    const name = eatValue();
    skipRequired(`equals`); // `=`
    const expression = capture(generateExpression);

    js(`
      let ${name};
      const _state_${name} = _getState(_state, "${name}", _ => ${name} = _, () => ${expression});
    `);
  }

  function generateTagInstantiation() {
    // if (defaultMode !== Mode.BROWSER) throw new Error(defaultMode);
    skip(); // `:`
    let defaultStringExpression = null;
    let tagType = eatValue();
    // if (is(`stringstart`)) {
    //   defaultStringExpression = generateStringExpression();
    //   tagType = `span`;
    // } else {
    //   tagType = eatValue();
    // }
    const {unnamedStaticExpressions, namedStaticExpressions, unnamedExpressions, namedExpressions} = parseTagInstantiationProps();
    // if (defaultStringExpression) {
    //   unnamedExpressions.append(defaultStringExpression);
    // }
    let children = "";
    if (is(`blockstart`)) {
      skip();
      withNewScope(() => {
        children = generateBlockContents(`blockend`);
      });
      skip(); // `blockend`
    }

    writeTagInstantiation(tagType, unnamedStaticExpressions,
      namedStaticExpressions, unnamedExpressions, namedExpressions, children);
  }

  function writeTagInstantiation(tagType, unnamedStaticExpressions = ``,
    namedStaticExpressions = ``, unnamedExpressions = ``, namedExpressions = ``, children) {
    js(`
      _tag(
        ${nextScopeId()},
        "${tagType}",
        [${unnamedStaticExpressions}],
        {${namedStaticExpressions}},
        [${unnamedExpressions}],
        {${namedExpressions}},
        ${children ? `,() => {
          ${children}
        }` : ``});
    `);
  }

  function parseTagInstantiationProps() {
    // if (defaultMode !== Mode.BROWSER) throw new Error(defaultMode);
    let unnamedStaticExpressions = ``;
    let namedStaticExpressions = ``;
    let unnamedExpressions = ``;
    let namedExpressions = ``;
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
      const isFunction = is(`functiondeclarationstart`);
      const isStaticString = is(`stringstart`) && isAhead(`stringliteral`) && isAhead(`stringend`, 2);
      const isStaticValue = isStaticString || isFunction || is(`numberliteral`);
      function appendNamed(value) {
        if (isStaticValue) {
          if (namedStaticExpressions !== ``) namedStaticExpressions += `,`;
          namedStaticExpressions += value;
        } else {
          if (namedExpressions !== ``) namedExpressions += `,`;
          namedExpressions += value;
        }
      }
      function appendUnnamed(value) {
        if (isStaticValue) {
          if (unnamedStaticExpressions !== ``) unnamedStaticExpressions += `,`;
          unnamedStaticExpressions += value;
        } else {
          if (unnamedExpressions !== ``) unnamedExpressions += `,`;
          unnamedExpressions += value;
        }
      }
      let value = capture(generateExpression);
      if (isFunction) {
        value = `_handle(_fn(${value}))`;
      }
      if (isTwoWayBinding) {
        let assignmentStr = ``;
        if (isSimpleVarRef) {
          assignmentStr += `$state_${value}.assign($v)`;
        } else { // simple variable ref
          assignmentStr += `${value}=$v`;
        }
        if (name) {
          appendNamed(`${name}:${value}on${name}Change:$v => ${assignmentStr}`);
        } else {
          appendUnnamed(unnamedExpressions += `${value},$v => ${assignmentStr}`);
        }
      } else {
        if (name) {
          appendNamed(`${name}:${value}`);
        } else {
          appendUnnamed(`${value}`);
        }
      }
    }
    return {unnamedStaticExpressions, namedStaticExpressions, unnamedExpressions, namedExpressions};
  }

  function generateFunctionDeclaration() {
    if (!is(`identifier`) || !isValue(`fn`)) die(`expected "fn"`);
    skip(); // `fn`
    const name = escapeJsKeywords(eatValueRequired(`identifier`));
    const expression = generateFunctionExpression();
    
    return defaultCode(`${name} = `, expression, [name]);
  }

  function parseExpression() {
    const value = capture(generateExpressionValue);
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

    return js(expressionAst.value + memberCallExpressions.join(``));
  }

  function generateFunctionExpression(paramExpression = `()`) {
    if (is(`parenstart`)) {
      if (paramExpression !== `()`) die(`expected hyphen`);
      paramExpression = capture(generateParameterList);
    }
    skipRequired(`functiondeclarationstart`);
    const fnBody = capture(generateBlock);

    return js(`${paramExpression}=>{${fnBody}}`);
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
      generateStringExpression(parseStringExpression());
    } else if (is(`bracketstart`)) {
      generateListExpression();
    } else if (is(`identifier`)) {
      if (isValue(`style`)) {
        generateStyleExpression();
      } else if (isAhead(`dash`) && isAhead(`greaterthan`, 2)) {
        const argName = eatValue();
        generateFunctionExpression(argName);
      } else if (isValue(`if`)) {
        generateIfExpression();
      } else if (isValue(`import`)) {
        generateImport();
      } else {
        js(escapeJsKeywords(eatValue()));
      }
    } else if (is(`functiondeclarationstart`)) {
      generateFunctionExpression();
    } else if (is(`parenstart`)) {
      generatedParenBasedExpression();
    } else if (is(`curlystart`)) {
      generatedObjectExpression();
    } else if (is(`numberliteral`)) {
      js(eatValue());
    } else if (is(`functiondeclarationstart`)) {
      js(eatValue());
    } else {
      throw new Error(`expected expression value`);
    }
  }

  function generateImport() {
    skipRequired(`identifier`); // import
    let importType = ``;
    if (is(`identifier`)) {
      if (isValue(`module`)) {
        importType = `Module`;
      } else if (isValue(`npm`)) {
        importType = `Npm`;
      } else {
        throw new Error(`unexpected import type "${getValue()}"`);
      }
      skip(); // module type
    }
    const pathAst = parseStringExpression();
    if (pathAst.elements.some(_ => _.type === `codeblock`)) {
      die(`string interpolation not allowed in import expression`);
    }
    if (pathAst.elements.length === 0) {
      die(`path is required for import`);
    }
    const isNamed = isValue(`as`);
    let name = null;
    if (isNamed) {
      skip(); // as
      name = eatValueRequired(`identifier`);
      declaredVariableNames.push(name);
      js(`(() => ${name} = `);
    }
    let path = pathAst.elements[0].value;
    js(`_import${importType}(${importStringToArgs(path)})`);
    if (isNamed) {
      js(`)()`);
    }
  }

  function importStringToArgs(importString) {
    let importName = importString.replaceAll(`"`, `\\"`);
    const elements = importName.split(`:`);
    let module = file.moduleName;
    if (elements.length > 1) {
      module = elements[0];
      importName = elements[1];
    }
    return `"${module}", "${importName}"`;
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

  function parseStringExpression() {
    skip(); // `"`
    const ast = {type: `stringexpression`, elements: []};
    while (!eof() && (is(`stringliteral`) || is(`stringcodeblockstart`))) {
      if (is(`stringliteral`)) {
        const value = eatValue();
        ast.elements.push({type: `literal`, value});
      } else {
        skip(); // stringcodeblockstart
        const value = capture(generateExpression);
        skip(); // stringcodeblockend
        ast.elements.push({type: `codeblock`, value});
      }
    }
    skip(); // `"`
    return ast;
  }

  function generateStringExpression(ast) {
    js(`"`);
    for (const element of ast.elements) {
      if (element.type === `literal`) {
        js(element.value);
      } else {
        js(`"+(`);
        js(element.value);
        js(`)+"`);
      }
    }
    js(`"`);
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

  function importFile(importPath) {
    const importFiles = files.filter(x => x.path === importPath);
    if (importFiles.length === 0) {
      throw new Error(`could not find imported file "${importPath}"`);
    }
    const importFile = importFiles[0];
    if (!importFile.js) {
      lex(importFile, files);
      generateFile(importFile, files);
    }
    return importFile;
  }

  function nextScopeId() {
    const lastIndex = scopeIds.length - 1;
    const value = scopeIds[lastIndex] + 1;
    scopeIds[lastIndex] = value;
    return value;
  }

  function withNewScope(fn) {
    scopeIds.push(0);
    fn();
    scopeIds.pop();
  }

  function defaultToBrowser(component, part, fn) {
    if (!defaultMode) throw new Error(`default mode required`);
    if (!component) throw new Error(`default component required`);
    if (!part) throw new Error(`default component part required`);
    const savedComponent = component;
    defaultComponent = component;
    const savedPart = part;
    defaultComponentPart = part;
    withDefaultMode(`browser`, fn);
    defaultComponent = savedComponent;
    defaultComponentPart = savedPart;
  }

  function defaultToBrowserHead(fn) {
    withDefaultMode(`browserhead`, fn);
  }

  function defaultToBrowserInit(fn) {
    withDefaultMode(`browserinit`, fn);
  }

  function defaultToServer(fn) {
    withDefaultMode(`server`, fn);
  }

  function defaultToServerInit(fn) {
    withDefaultMode(`serverinit`, fn);
  }

  function defaultToDatabase(fn) {
    withDefaultMode(`database`, fn);
  }

  function withDefaultMode(mode, fn) {
    const savedMode = defaultMode;
    defaultMode = mode;
    fn();
    defaultMode = savedMode;
  }

  function js(code) {
    defaultAppender(code);
  }
  
  // function jsAppender(code) {
  //   if (!defaultMode) throw new Error(`default mode required`);
  //   if (!defaultComponent) throw new Error(`default component required`);
  //   if (!defaultComponentPart) throw new Error(`default component part required`);
  //   if (defaultMode === `browser`) {
  //     return browserJs(defaultComponent, defaultComponentPart, code);
  //   } else if (defaultMode === `browserhead`) {
  //     return browserHeadJs(code);
  //   } else if (defaultMode === `browserinit`) {
  //     return browserInitJs(code);
  //   } else if (defaultMode === `server`) {
  //     return serverJs(code);
  //   } else if (defaultMode === `serverinit`) {
  //     return serverInitJs(code);
  //   } else if (defaultMode === `database`) {
  //     return databaseJs(code);
  //   }
  // }

  // function browserJs(component, part, code) {
  //   let componentObj = browserComponentCode[component];
  //   if (!componentObj) {
  //     componentObj = {};
  //     browserComponentCode[component] = componentObj;
  //   }
  //   componentObj[part] = (componentObj[part] || ``) + code;
  // }

  // function browserHeadJs(code) {
  //   browserHeadCode += code;
  // }

  // function browserInitJs(code) {
  //   browserInitCode += code;
  // }

  // function serverJs(code) {
  //   serverCode += code;
  // }

  // function serverInitJs(code) {
  //   serverInitCode += code;
  // }

  // function databaseJs(code) {
  //   databaseCode += code;
  // }

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

  function capture(fn) {
    let value = "";
    withAppender(newValue => value += newValue, fn);
    return value;
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
    throw {msg, position: parser.eatenInput[parser.eatenInput.length - 1]?.position || 0, type: `PARSING`, file};
  }

  function escapeJsKeywords(value) {
    if (!value) return value;
    if (jsKeywordsToEscape.includes(value)) return `$_${value}`;
    else return value;
  }
};