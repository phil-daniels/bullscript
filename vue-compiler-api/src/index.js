const {compileTemplate} = require(`@vue/compiler-sfc`);

const result = compileTemplate({
    id: `YO_ID`,
    source: `<h1>Hey man</h1>
    <ol v-for="num in nums">{{num}}</ol>`,
    filename: `coooooool_file.yodude`,
});

result;