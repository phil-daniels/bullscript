const tokenTypes = require(`./token-types`)

module.exports = input => {
  const parser = {
    input,
    eatenInput: [],
    eof: function() {
      return this.input.length === 0;
    },
    is: function(...tokenTypes) {
      tokenTypes.forEach(t => verify(t));
      return tokenTypes.includes(this.input[0]?.tokenType);
    },
    isValue: function(...values) {
      return values.includes(this.input[0]?.value);
    },
    skip: function(num = 1) {
      for (let i = 0; i < num; i++) {
        const t = this.input.shift();
        this.eatenInput.push(t);
      }
    },
    eatValue: function() {
      const value = this.input[0]?.value;
      this.skip();
      return value;
    },
    eat: function() {
      const value = this.input[0];
      this.skip();
      return value;
    },
    eatRequired: function(tokenType) {
      verify(tokenType);
      if (this.is(tokenType)) return this.eat();
      else die(`expecting ${tokenType}`);
    },
    eatValueRequired: function(tokenType) {
      verify(tokenType);
      if (this.is(tokenType)) return this.eatValue();
      else die(`expecting ${tokenType}`);
    },
    skipRequired: function(tokenType) {
      verify(tokenType);
      if (this.is(tokenType)) this.skip();
      else die(`expecting ${tokenType}`);
    },
    asString: function() {
      return JSON.stringify(this.input[0]);
    },
    isAhead: function(tokenType, num = 1) {
      verify(tokenType);
      return this.input.length <= this.num ? false : this.input[num].tokenType === tokenType;
    },
  };
  function die(msg) {
    throw {msg, position: parser.eatenInput[parser.eatenInput.length - 1].position, type: `PARSING`};
  }
  return parser;
}

function verify(tokenType) {
  if (!tokenTypes.includes(tokenType)) throw new Error(`"${tokenType}" is not a valid token type`);
}
