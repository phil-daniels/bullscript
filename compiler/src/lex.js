/**
 * Converts code to tokens. Strips out comments and insignificant whitespace. Resolves indent structuring.
 */
const createLexer = require(`./create-lexer`);

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z_0-9]*/;
const SPACES = /^[ ]+/;
const SPACES_THEN_IDENTIFIER = /^[ ]+[a-zA-Z_][a-zA-Z_0-9]*/;
const NUMBER = /^[0-9]+/

const BOUNDRIES = [`\``, `"`, `(`, `)`, `{`, `}`, '[', `]`, `/*`];

module.exports = input => {
  const lexer = createLexer(input);
  const is = lexer.is.bind(lexer);
  const eof = lexer.eof.bind(lexer);
  const matches = lexer.matches.bind(lexer);
  const matchesRegex = lexer.matchesRegex.bind(lexer);
  const regexLength = lexer.regexLength.bind(lexer);
  const discardMatch = lexer.discardMatch.bind(lexer);
  const skip = lexer.skip.bind(lexer);
  const create = lexer.create.bind(lexer);
  const eat = lexer.eat.bind(lexer);

  while (!eof()) {
    convertIndent(-1, null);
  }
  return lexer.output;

  function convertIndent(parentIndent, terminators = [`}`, `)`, `]`]) {
    lexer; // TODO remove, doesn't show up in debugger if not used
    const myIndent = parentIndent + 1;
    let deindent = false;
    const startOutputCount = lexer.output.length;
    while (!eof() && (!terminators || !is(...terminators)) && !deindent) {
      lexUntil(`\n`, ...BOUNDRIES);
      if (eof()) break;
      if (is(`\n`)) {
        skip(); // newline
        const indent = regexLength(SPACES);
        if (indent === myIndent) {
          create(`statementend`);
        } else if (indent > myIndent) {
          create(`blockstart`);
          convertIndent(myIndent);
          create(`blockend`, `statementend`);
        } else {
          deindent = true;
        }
      } else {
        lexAtBoundry();
      }
    }
    if (lexer.output.length > startOutputCount) create(`statementend`);
  }

  function convertParenOrCurlyOrBracket(terminator) {
    while (!eof() && !is(terminator)) {
      lexUntil(...BOUNDRIES);
      lexAtBoundry();
    }
  }

  function lexAtBoundry() {
    if (is(`(`)) {
      create(`parenstart`);
      skip();
      convertParenOrCurlyOrBracket(`)`);
      create(`parenend`);
      if (!eat() !== `)`) throw new Error(`expecting ")" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
    } else if (is(`{`)) {
      create(`curlystart`);
      skip();
      convertParenOrCurlyOrBracket(`}`);
      create(`curlyend`);
      if (!eat() !== `}`) throw new Error(`expecting "}" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
    } else if (is(`[`)) {
      create(`bracketstart`);
      skip();
      convertParenOrCurlyOrBracket(`]`);
      create(`bracketend`);
      if (eat() !== `]`) throw new Error(`expecting "]" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
    } else if (is(`"`)) {
      convertString();
    } else if (is(`\``)) {
      convertBackticks();
    } else if (is(`/*`)) {
      while (!eof() && !is(`*/`)) {
        const c = eat();
        if (c === `\\`) {
          skip();
        }
      }
      if (!eof()) skip(2); // */
    }
  }

  function convertString() {
    create(`stringstart`);
    skip(); // "
    let literal = "";
    while (!eof()) {
      while (!eof() && !is(`"`, `{`)) {
        const c = eat();
        literal += c;
        if (c === `\\`) {
          literal += eat();
        }
      }
      if (eof()) break;
      if (is(`"`)) {
        if (literal.length > 0) create(`stringliteral`, literal);
        break;
      }
      if (is(`{`)) {
        skip(); // {
        convertParenOrCurlyOrBracket(`}`);
        skip(); // }
      }
    }
    create(`stringend`);
    skip(); // "
  }

  function lexUntil(...terminators) {
    lexer;
    while (!eof() && !is(...terminators)) {
      if (matches(` `)) {
        discardMatch();
      } else if (matches(`\n`)) {
        discardMatch();
      } else if (matches(`\r\n`)) {
        discardMatch();
      } else if (matchesRegex(IDENTIFIER)) {
        create(`identifier`);
        const spaceCount = regexLength(SPACES);
        if (spaceCount > 0) {
          if (regexLength(SPACES_THEN_IDENTIFIER) > spaceCount) {
            create(`space`, null);
          }
        }
      } else if (matchesRegex(NUMBER)) {
        create(`numberliteral`);
      } else if (matches(`=`)) {
        create(`equals`);
      } else if (matches(`,`)) {
        create(`comma`);
      } else {
        throw new Error(`cannot lex at position ${lexer.eatenInput.length}, starting here "${lexer.input}"`);
      }
    }
  }
};
