/**
 * Converts code to tokens. Strips out comments and insignificant whitespace. Resolves indent structuring.
 */
const createLexer = require(`./create-lexer`);

const DEBUG = true;

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z_0-9]*/;
const SPACES = /^[ ]+/;
const SPACES_THEN_IDENTIFIER = /^[ ]+[a-zA-Z_][a-zA-Z_0-9]*/;
const NUMBER = /^[0-9]+/;
const WHITESPACE = /\s+/;

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

  debug(`lexing input ${input}`);
  while (!eof()) {
    convertIndent(-3, null); // start at negative 1 indent
  }
  return lexer.output;

  function convertIndent(parentIndent, terminators = [`}`, `)`, `]`]) {
    lexer;
    const myIndent = parentIndent + 3;
    let deindent = false;
    const startOutputCount = lexer.output.length;
    while (!eof() && (!terminators || !is(...terminators)) && !deindent) {
      let preStatementOutputCount = lexer.output.length;
      while(!eof() && !is(`\n`)&& !is(`\r\n`)) {
        lexUntil(`\r\n`, `\n`, ...BOUNDRIES);
        if (!is(`\n`) && !is(`\r\n`)) {
          lexAtBoundry();
        }
      }
      if (!eof()) {
        if (is(`\r`)) skip();
        skip(); // newline
        if (lexer.output.length > preStatementOutputCount) {
          const indent = regexLength(SPACES);
          if (indent === myIndent) {
            create(`statementend`);
          } else if (indent === myIndent + 3) {
            create(`blockstart`);
            convertIndent(myIndent);
            create(`blockend`);
            create(`statementend`);
          } else if (indent < myIndent && (indent % 3 === 0)) {
            create(`statementend`);
            deindent = true;
          } else {
            die(`invalid indent`);
          }
        } // else is blank line, ignore
      }
    }
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
      if (eat() !== `)`) throw new Error(`expecting ")" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
    } else if (is(`{`)) {
      create(`curlystart`);
      skip();
      convertParenOrCurlyOrBracket(`}`);
      create(`curlyend`);
      if (eat() !== `}`) throw new Error(`expecting "}" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
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

  function convertBackticks() {
    lexer;
    // 1) skip backtick
    // 2) skip whitespace
    // 3) convertIndent
    // 4) will return on deindent, then continue to 2) until close backtick
    /*
    skip(); // backtick
    if (is(`\n`)) {
      skip();
    }
    while (!eof() && !is(`backtick`)) {
      let whitespaceLength = regexLength(WHITESPACE);
      skip(whitespaceLength);
      convertIndent();
    }
    */
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
        create(`stringcodeblockstart`);
        convertParenOrCurlyOrBracket(`}`);
        skip(); // }
        create(`stringcodeblockend`);
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
      } else if (matchesRegex(NUMBER)) {
        create(`numberliteral`);
      } else if (matches(`=`)) {
        create(`equals`);
      } else if (matches(`:`)) {
        create(`colon`);
      } else if (matches(`;`)) {
        create(`semicolon`);
      } else if (matches(`,`)) {
        create(`comma`);
      } else if (matches(`*`)) {
        create(`asterisk`);
      } else if (matches(`+`)) {
        create(`plus`);
      } else if (matches(`-`)) {
        create(`dash`);
      } else if (matches(`/`)) {
        create(`slash`);
      } else if (matches(`\\`)) {
        create(`backslash`);
      } else if (matches(`|`)) {
        create(`pipe`);
      } else if (matches(`!`)) {
        create(`exclamationmark`);
      } else if (matches(`>`)) {
        create(`greaterthan`);
      } else if (matches(`.`)) {
        create(`dot`);
      } else {
        die(`I don't understand this character`);
      }
    }
  }

  function debug(msg) {
    if (debug) console.log(msg);
  }

  function die(msg) {
    throw {msg, position: lexer.eatenInput.length, type: `LEXING`};
  }
};
