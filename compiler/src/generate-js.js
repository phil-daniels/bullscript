const createParser = require(`./create-parser`);

module.exports = tokens => {
  const parser = createParser(tokens);
  const eof = parser.eof.bind(parser);
  const is = parser.is.bind(parser);
  const isValue = parser.isValue.bind(parser);
  const isKeyword = parser.isKeyword.bind(parser);
  const skip = parser.skip.bind(parser);
  const eatValue = parser.eatValue.bind(parser);

  const {browser, server, serverInit} = generateBlock(); // keep only the js
  return {browser, server, serverInit};

  function generateBlock() {
    const blockCode = code();
    while (!eof()) {
      const statementCode = generateStatement();
      blockCode.append(statementCode);
      if (!is(`statementend`)) throw new Error();
      skip(); // `statementend`
    }
    
    const varsToCode = vars => vars.length > 0 ? `let ${vars.join(`,`)};` : ``;
    blockCode.browser = varsToCode(blockCode.browserBlockVars) + blockCode.browser;
    blockCode.server = varsToCode(blockCode.serverBlockVars) + blockCode.server;
    blockCode.serverInit = varsToCode(blockCode.serverInitBlockVars) + blockCode.serverInit;
    if (blockCode.browser) blockCode.browser = `{${blockCode.browser}}`;
    if (blockCode.server) blockCode.server = `{${blockCode.server}}`;
    if (blockCode.serverInit) blockCode.serverInit = `{${blockCode.serverInit}}`;
    return blockCode;
  }

  function generateStatement() {
    parser;
    if (isKeyword(`state`)) {
      return generateStateDeclaration();
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
      `const $state_${name} = bs.state("${name}", $ => ${name} = $, ${expression});`,
      ``,
      ``,
      ``,
      [name],
    );
  }
  
  function generateExpression() {
    if (is(`stringstart`)) {
      return generateStringExpression();
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
    };
  }

  function pushAll(arr, items) {
    for (let item of items) {
      arr.push(item);
    }
  }
};