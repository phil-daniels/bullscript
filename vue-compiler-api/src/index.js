const {compileTemplate} = require(`@vue/compiler-sfc`);

https://programeasily.com/2021/01/30/computed-in-vue-3/

const input = {
  Main: {
    template: `<h1>Count: {{count}}</h1><CountButton/><h2>{{message}}</h2>`,
    script: `export default {
      data() {
        return {
          count: 0,
        };
      }
    }`,
    computed: {
      message: function() {
        return this.count < 6 ? `not enough` : `ENOUGH!!`;
      }
    },
    methods: {
      increment: function() {
        this.count++;
      }
    }
  },
  CountButton: {
    template: `<button @click="increment()">+</button>`,
    methods: {
      increment: function() {
        this.$parent.increment();
      }
    }
  }
};

const result = compileTemplate({
    id: `YO_ID`,
    source: `<h1>Hey man</h1>
    <ol v-for="num in nums">{{num}}</ol>`,
    filename: `coooooool_file.yodude`,
});

result;