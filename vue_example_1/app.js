const app = Vue.createApp({
  template: `
    <h1>todos</h1>
    <input v-model="newTodoLabel"/>
    {{newTodoLabel}}
    <button v-on:click='increment()'>Up!</button>
  `,
  data() {
    return {
      newTodoLabel: "",
    };
  },
  methods: {
    increment() {
        this.count++;
    }
  }
});
app.mount("#app");