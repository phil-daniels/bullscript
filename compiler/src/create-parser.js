const tokenTypes = require(`./token-types`)

module.exports = input => {
  return {
    input,
    eatenInput: [],
    eof: function() {
      return this.input.length === 0;
    },
    is: function(tokenType) {
      return this.input[0]?.tokenType === tokenType;
    },
    isValue: function(value) {
      return this.input[0]?.value === value;
    },
    isKeyword: function(keyword) {
      const t = this.input[0];
      const s = input[1];
      return t && s && t.tokenType === `identifier` && t.value === keyword && s.tokenType === `space`;
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
  };
}