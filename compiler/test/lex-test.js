const lex = require(`../src/lex`);

test(`state declaration, string literal`,

`state name = ""`,

`identifier`, `state`, 0,
`space`, null, 5,
`identifier`, `name`, 6,
`equals`, null, 11,
`stringstart`, null, 13,
`stringend`, null, 14,
`statementend`, null, 15,
);

test(`list creation, number literal`,

`state nums = [
  1, 2,
  3
]`,

`identifier`, `state`, 0,
`space`, null, 5,
`identifier`, `nums`, 6,
`equals`, null, 11,
`bracketstart`, null, 13,
`numberliteral`, `1`, 17,
`comma`, null, 18,
`numberliteral`, `2`, 20,
`comma`, null, 21,
`numberliteral`, `3`, 25,
`bracketend`, null, 27,
`statementend`, null, 28,
);

test(`multi-line comment`,

`/*yo
there
hey
man
*/`,

// nothing
);

function test(desc, input, ...expectedTokenData) {
  const tokens = lex(input);
  let i = 0;
  let tokenCount = 1;
  for (let token of tokens) {
    if (token.tokenType !== expectedTokenData[i]) throw new Error(`token #${tokenCount}, expected token type "${expectedTokenData[i]}", but got "${token.tokenType}"`);
    i++;
    if (expectedTokenData[i] !== null && token.value !== expectedTokenData[i]) throw new Error(`token #${tokenCount}, expected value "${expectedTokenData[i]}", but got "${token.value}"`);
    i++;
    if (token.position !== expectedTokenData[i]) throw new Error(`token #${tokenCount}, expected position "${expectedTokenData[i]}", but got "${token.position}"`);
    i++;
    tokenCount++;
  }
}