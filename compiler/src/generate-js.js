const createParser = require(`./create-parser`);

module.exports = (tokens, isComponent) => {
  const parser = createParser(tokens);
  const eof = parser.eof.bind(parser);
  const is = parser.is.bind(parser);
  const isValue = parser.isValue.bind(parser);
  const isKeyword = parser.isKeyword.bind(parser);
  const skip = parser.skip.bind(parser);
  const eatValue = parser.eatValue.bind(parser);
  const eatRequired = parser.eatRequired.bind(parser);
  const eatValueRequired = parser.eatValueRequired.bind(parser);
  const skipRequired = parser.skipRequired.bind(parser);

  const {browser, server, serverInit} = generateBlockContents(isComponent); // keep only the js
  return {browser, server, serverInit};

  function generateBlockContents(isComponent) {
    parser;
    const blockCode = code();
    while (!eof()) {
      const statementCode = generateStatement();
      statementCode.prependIfExists(`browser`, `() => `);
      statementCode.prependIfExists(`server`, `() => `);
      statementCode.prependIfExists(`serverInit`, `() => `);
      statementCode.appendIfExists(`browser`, `,`);
      statementCode.appendIfExists(`server`, `,`);
      statementCode.appendIfExists(`serverInit`, `,`);
      blockCode.append(statementCode);
      if (!is(`statementend`)) throw new Error();
      skip(); // `statementend`
    }

    function buildBlock(blockCode, type) {
      const blockVars = blockCode[`${type}BlockVars`];
      if (!blockCode[type] && blockVars.length === 0) return;
      blockCode[type] = `
        ${isComponent ? `return bs.children($children => {` : ``}
        ${blockVars.length > 0 ? `let ${blockVars.join(`,`)};` : ``};
        ${!isComponent ? `() => ` : ``}bs.pipe(
        ${blockCode[type]}
        )
        ${isComponent ? `});` : ``}
      `
    }

    buildBlock(blockCode, `browser`);
    buildBlock(blockCode, `server`);
    buildBlock(blockCode, `serverInit`);
    return blockCode;
  }

  function generateStatement() {
    parser;
    if (isKeyword(`state`)) {
      return generateStateDeclaration();
    } else if (is(`colon`)) {
      return generateTagInstantiation();
    } else {
      throw new Error();
    }
  }

  function generateStateDeclaration() {
    skip(2); // `state`, ` `
    const name = eatValue();
    skip(); // `=`
    const expression = generateExpression();

    return code(
      `$state_${name} = bs.state("${name}", $ => ${name} = $, ${expression})`,
      ``,
      ``,
      ``,
      [name, `$state_${name}`],
    );
  }

  function generateTagInstantiation() {
    skip(); // `:`
    const tagType = eatValue();
    const expressions = [];
    while (!eof() && !is(`statementend`, `curlystart`)) {
      expressions.push(generateExpression());
    }
    let expressionObj = `{}`;
    if (is(`curlystart`)) {
      expressionObj = generateObjectLiteral();
    }
    let children = "";
    if (is(`blockstart`)) {
      skip();
      children = generateBlockContents();
      skip(); // `blockend`
    }

    return code(
      `{
        $children.push(bs.tag("${tagType}",[${expressions.join(`,`)}],${expressionObj}${children ? `,${children}` : ``}));
      }`,
      ``,
      ``,
      ``,
    );
  }

  function generateObjectLiteral() {
    skipRequired(); // `{`
    let first = true;
    const props = {};
    while (first || is(`comma`)) {
      while (is(`comma`)) skip();
      const prop = eatValueRequired(`identifier`);
      skipRequired(`colon`);
      const value = generateExpression();
      props[prop] = value;
    }
    skipRequired(`curlyend`); // `}`
  }
  
  function generateExpression() {
    if (is(`stringstart`)) {
      return generateStringExpression();
    } else if (is(`bracketstart`)) {
      return generateListExpression();
    }
  }

  function generateStringExpression() {
    const pieces = [];
    skip(); // `"`
    while (!eof() && (is(`stringliteral`) || is(`stringcodeblock`))) {
      if (is(`stringliteral`)) {
        pieces.push(eatValue());
      } else {
        throw new Error(`implement me!`);
      }
    }
    skip(); // `"`

    return `"${pieces.join("")}"`;
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

    return `[${expressions.join(",")}]`;
  }

  function code(browser = ``, server = ``, serverInit = ``, database = ``, browserBlockVars = [],
      serverBlockVars = [], serverInitBlockVars = []) {
    return {
      browser,
      server,
      serverInit,
      database,
      browserBlockVars,
      serverBlockVars,
      serverInitBlockVars,
      append: function(otherCode) {
        this.browser += otherCode.browser;
        this.server += otherCode.server;
        this.serverInit += otherCode.serverInit;
        this.database += otherCode.database;
        pushAll(this.browserBlockVars, otherCode.browserBlockVars);
        pushAll(this.serverBlockVars, otherCode.serverBlockVars);
        pushAll(this.serverInitBlockVars, otherCode.serverInitBlockVars);
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
  }

  function pushAll(arr, items) {
    for (let item of items) {
      arr.push(item);
    }
  }
};