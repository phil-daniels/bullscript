const app = Vue.createApp({
  template: `
    <h1>todos</h1>
    <input v-model="newTodoLabel" @keyup.enter="add"/>
    <template v-for="todo in todos">
      <div>
        <div @click="toggleCompleted(todo)">{{todo.label}}</div>
      </div>
    </template>
    <button v-on:click='increment()'>Up!</button>
  `,
  data() {
    return {
      newTodoLabel: "",
      todos: [],
    };
  },
  methods: {
    add() {
      this.todos.push({label: this.newTodoLabel, completed: false});
      this.newTodoLabel = "";
    },
    toggleCompleted(todo) {
      todo.completed = !todo.completed;
    },
  }
});
app.mount("#app");