const tokenTypes = require(`./token-types`)

module.exports = input => {
  return {
    input,
    eatenInput: [],
    eof: function() {
      return this.input.length === 0;
    },
    is: function(...tokenTypes) {
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
      if (this.is(tokenType)) return this.eat();
      else throw new Error(`expecting ${tokenType}`);
    },
    eatValueRequired: function(tokenType) {
      if (this.is(tokenType)) return this.eatValue();
      else throw new Error(`expecting ${tokenType}`);
    },
    skipRequired: function(tokenType) {
      if (this.is(tokenType)) this.skip();
      else throw new Error(`expecting ${tokenType}`);
    },
    asString: function() {
      return JSON.stringify(this.input[0]);
    }
  };
}
