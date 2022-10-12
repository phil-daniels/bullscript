const createParser = require(`./create-parser`);

module.exports = tokens => {
  const parser = createParser(tokens);
  const eof = parser.eof.bind(parser);
  const is = parser.is.bind(parser);
  const isValue = parser.isValue.bind(parser);
  const isKeyword = parser.isKeyword.bind(parser);
  const skip = parser.skip.bind(parser);
  const eatValue = parser.eatValue.bind(parser);

  let browserJs = "";
  let blockVars = [];
  let js = value => browserJs += value;

  generateBlock();
  return {browserJs, serverInitJs: ``, serverRequestJs: ``};

  function generateBlock() {
    const savedBlockVars = blockVars;
    blockVars = [];
    const savedBrowserJs = browserJs;

    while (!eof()) {
      generateStatement();
      if (!is(`statementend`)) throw new Error();
      skip(); // `statementend`
    }
    
    const varNameCode = `let ${blockVars.join(`,`)}`;
    browserJs = `${savedBrowserJs}{${varNameCode};${browserJs}}`;
    blockVars = savedBlockVars;
  }

  function generateStatement() {
    parser;
    if (isKeyword(`state`)) {
      generateStateDeclaration();
    }
  }

  function generateStateDeclaration() {
    skip(2); // `state`, ` `
    const name = eatValue();
    skip(); // `=`
    const expression = capture(generateExpression);

    blockVars.push(name);
    browserJs += `const $assign_${name} = bs.state(React.useState(bs.initState("${name}", $ => ${name} = $, ${expression})));`;
  }
  
  function generateExpression() {
    if (is(`stringstart`)) {
      generateStringExpression();
    }
  }

  function generateStringExpression() {
    const pieces = [];
    skip(); // `stringstart`
    while (!eof() && (is(`stringliteral`) || is(`stringcodeblock`))) {
      if (is(`stringliteral`)) {
        pieces.push(eatValue());
      } else {
        throw new Error(`implement me!`);
      }
    }
    skip(); // `stringend`

    js(`"${pieces.join("")}"`);
  }

  function asMode(mode, fn) {
    const savedMode = js;
    if (mode === `browser`) {
      js = value => browserJs += value;
    } else {
      throw new Error();
    }
    const result = fn();
    js = savedMode;
    return result;
  }

  function capture(fn) {
    const savedMode = js;
    let captured = "";
    js = value => captured += value;
    fn();
    js = savedMode;
    return captured;
  }
};