const lex = require(`../src/lex`);
const generateJs = require(`../src/generate-js`);

test(`state declaration, string literal`,

`state name = ""`,

`{let name;const $assign_name = bs.state(React.useState(bs.initState("name", $ => name = $, "")));}`
);

function test(desc, input, expectedBrowserJs) {
  const tokens = lex(input);
  const {browser} = generateJs(tokens);
  if (browser !== expectedBrowserJs) throw new Error();
}