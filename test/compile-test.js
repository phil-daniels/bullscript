const {internalCompile, tag} = require("../src/compile");

browserTest(
  tag,
  `
    <input type: "text", *newName/>
  `,
  `
    () => $children.push(React.createElement("input", {type: "text, onChange={($e) => newName.$set($e.target.value)} value={newName.$get()}})),
  `
);
if (
  internalCompile(tag, `
    <input type: "text", *newName/>
  `).trim() !== `
    
  `.trim()
) {

}

function browserTest(compiler, input, expectedOutput) {
  const output = internalCompile(tag, input).browserCode.trim();
  if (expectedOutput.trim() !== output) {
    throw new Error();
  }
}