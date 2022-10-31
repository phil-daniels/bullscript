const tokenTypes = require("./token-types");

module.exports = (input, shouldDebug) => {
  const lexer = {
    input,
    eatenInput: ``,
    output: [],
    matchValue: ``,
    is: function(...strs) {
      if (this.eof()) throw new Error("cannot call is(...) when EOF");
      let found = false;
      for (const str of strs) {
        if (this.input.startsWith(str)) {
          found = true;
          break;
        }
      }
      return found;
    },
    isRegex: function(regex) {
      return this.input.test(regex);
    },
    eof: function() {
      return this.input.length === 0;
    },
    matchesRegex: function(regex) {
      const match = this.input.match(regex);
      if (match) {
        const value = match[0];
        this.matchValue = value;
        this.matchIndex = this.eatenInput.length;
        this.skip(value.length);
        return true;
      }
      return false;
    },
    regexLength: function(regex) {
      const match = this.input.match(regex);
      if (match) return match[0].length;
      else return 0;
    },
    matches: function(str) {
      if (this.is(str)) {
        this.matchValue = str;
        this.matchIndex = this.eatenInput.length;
        this.skip(str.length);
        return true;
      }
      return false;
    },
    create: function(tokenType, value) {
      if (!tokenTypes.includes(tokenType)) throw new Error(`"${tokenType}" is not a valid token type`);
      const token = {tokenType};
      token.position = typeof this.matchIndex !== `undefined` ? this.matchIndex : this.eatenInput.length;
      if (typeof this.matchIndex !== `undefined`) {
        token.value = this.matchValue;
        this.discardMatch();
      }
      if (value) token.value = value;
      debug(`created ${JSON.stringify(token)}`);
      this.output.push(token);
    },
    discardMatch: function(num = 1) {
      delete this.matchIndex;
      delete this.matchValue;
    },
    skip: function(num = 1) {
      if (num === 0) return;
      if (this.eof()) throw new Error(`unexpected EOF`);
      this.eatenInput += this.input.substring(0, num);
      this.input = this.input.substring(num);
    },
    eat: function() {
      const c = this.input[0];
      this.skip();
      return c;
    }
  };
  function debug(msg) {
    if (shouldDebug) {
      const input = lexer.input.replaceAll(`\r`, `\\r`).replaceAll(`\n`, `\\n`);
      const eatenInput = lexer.eatenInput.replaceAll(`\r`, `\\r`).replaceAll(`\n`, `\\n`);
      const eatenLength = Math.min(15, eatenInput.length);
      const length = 30 - eatenLength;
      console.log(`    \`${
        eatenInput.substring(eatenInput.length - eatenLength)
      }[~]${
        input.substring(0, length)
      }\` // ${msg}`);
    }
  }
  return lexer;
};