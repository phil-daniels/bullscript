/**
 * Converts code to tokens. Strips out comments and insignificant whitespace. Resolves indent structuring.
 */
const createLexer = require(`./create-lexer`);

const DEBUG = true;

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z_0-9]*/;
const SPACES = /^[ ]+/;
const SPACES_THEN_IDENTIFIER = /^[ ]+[a-zA-Z_][a-zA-Z_0-9]*/;
const NUMBER = /^[0-9]+/;
const WHITESPACE = /^\s+/;

const BOUNDRIES = [`\``, `"`, `(`, `)`, `{`, `}`, '[', `]`, `/*`, `//`, `./`, `../`];

module.exports = (input, filePath) => {
  const lexer = createLexer(input, DEBUG);
  const is = lexer.is.bind(lexer);
  const isRegex = lexer.isRegex.bind(lexer);
  const eof = lexer.eof.bind(lexer);
  const matches = lexer.matches.bind(lexer);
  const matchesRegex = lexer.matchesRegex.bind(lexer);
  const regexLength = lexer.regexLength.bind(lexer);
  const discardMatch = lexer.discardMatch.bind(lexer);
  const skip = lexer.skip.bind(lexer);
  const create = lexer.create.bind(lexer);
  const eat = lexer.eat.bind(lexer);
  const eatUntil = lexer.eatUntil.bind(lexer);

  debug(`===========================================================`);
  debug(`= START LEXER: ${filePath}`);
  debug(`===========================================================`);
  debug(`lexing input`, input);
  debug(`    \`[~]${input.substring(0, 30).replaceAll(`\r`, `\\r`).replaceAll(`\n`, `\\n`)}\``);
  while (!eof()) {
    convertIndent(-3, []); // start at negative 1 indent
  }
  return lexer.output;

  function convertIndent(parentIndent, terminators = [`}`, `)`, `]`]) {
    lexer;
    debug(`INDENT MODE`);
    const myIndent = parentIndent + 3;
    let deindent = false;
    const startOutputCount = lexer.output.length;
    while (!eof() && (!terminators || !is(...terminators)) && !deindent) {
      let preStatementOutputCount = lexer.output.length;
      while(!eof() && !is(`\n`) && !is(`\r\n`) && !is(`;`)) {
        lexUntil(`\r\n`, `\n`, `;`, ...BOUNDRIES);
        if (is(...terminators)) break;
        if (!is(`\n`) && !is(`\r\n`) && !is(`;`)) {
          lexAtBoundry();
          debug(`INDENT MODE`);
        }
      }
      if (!eof()) {
        const semicolonPeer = is(`;`);
        if (semicolonPeer) {
          skip(); // semicolon
        } else {
          if (is(`\r`)) skip();
          if (is(`\n`)) skip();
        }
        if (lexer.output.length > preStatementOutputCount) {
          const indent = regexLength(SPACES);
          if (indent === myIndent || semicolonPeer) {
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
    debug(`PAREN/CURLY/BRACKET MODE`);
    while (!eof() && !is(terminator)) {
      lexUntil(...BOUNDRIES);
      lexAtBoundry();
    }
  }

  function lexAtBoundry() {
    if (is(`(`)) {
      skip();
      create(`parenstart`);
      convertParenOrCurlyOrBracket(`)`);
      if (eat() !== `)`) throw new Error(`expecting ")" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
      create(`parenend`);
    } else if (is(`{`)) {
      skip();
      create(`curlystart`);
      convertParenOrCurlyOrBracket(`}`);
      if (eat() !== `}`) throw new Error(`expecting "}" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
      create(`curlyend`);
    } else if (is(`[`)) {
      skip();
      create(`bracketstart`);
      convertParenOrCurlyOrBracket(`]`);
      if (eat() !== `]`) throw new Error(`expecting "]" at position ${lexer.eatenInput.length}, but was "${lexer.input}"`);
      create(`bracketend`);
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
    } else if (is(`//`)) {
      while (!eof() && !is(`\n`)) {
        const c = eat();
        if (c === `\\`) {
          skip();
        }
      }
      if (!eof()) skip(); // \n
    } else if (is(`./`) || is(`../`)) {
      convertModuleReference();
    }
  }

  function convertModuleReference() {
    lexer;
    debug(`MODULE REFERENCE MODE`);
    const referencesParent = is(`../`);
    skip(2); // .. or ./
    if (referencesParent) skip(); // /
    const value = eatUntil(() => eof() || isRegex(WHITESPACE) || is(BOUNDRIES));
    if (referencesParent) {
      create(`modulereferenceparent`, value);
    } else {
      create(`modulereference`, value);
    }
  }

  function convertBackticks() {
    lexer;
    debug(`BACKTICK MODE`);
    // 1) skip backtick
    // 2) skip whitespace
    // 3) convertIndent
    // 4) will return on deindent, then continue to 2) until close backtick
    skip(); // backtick
    if (is(`\r`)) skip();
    if (is(`\n`)) skip();
    while (!eof() && !is(`\``)) {
      const bookmark = lexer.eatenInput.length;
      let whitespaceLength = regexLength(WHITESPACE);
      skip(whitespaceLength);
      convertIndent(whitespaceLength - 3, [`\``, `)`, `]`, `}`]);
      if (bookmark === lexer.eatenInput.length) {
        if (!eof() && !is(`\``)) {
          die(`expecting backtick`);
        } else {
          throw new Error(`infinite loop`);
        }
      }
    }
    if (is(`\``)) skip();
  }

  function convertString() {
    debug(`STRING MODE`);
    skip(); // "
    create(`stringstart`);
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
    skip(); // "
    create(`stringend`);
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
      } else if (matches(`#`)) {
        create(`pound`);
      } else {
        die(`I don't understand this character`);
      }
    }
  }

  function debug(msg, code) {
    let truncatedCode = ``;
    if (code) {
      truncatedCode = code.split(`\n`, 1)[0].replaceAll(`\r`, ``);
      if (truncatedCode.length < code.length) truncatedCode += `...`;
      truncatedCode = `: \`${truncatedCode}\``;
    }
    if (debug) console.log(msg + truncatedCode);
  }

  function die(msg) {
    throw {msg, position: lexer.eatenInput.length, type: `LEXING`};
  }
};
