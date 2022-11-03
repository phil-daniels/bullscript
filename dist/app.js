const http = require('http');

let appHtml;



http.createServer((request, response) => {
  undefined
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(appHtml);
  response.end();
}).listen(8080);

console.log("Started!");

appHtml = `
<html>

<body>
    <div id="app"></div>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css" integrity="sha512-HqxHUkJM0SYcbvxUw5P60SzdOTy/QVwA1JJrvaXJv4q7lmbDZCmZaqz01UPOaQveoxfYRv1tHozWGPMcuTBuvQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <style>
        .margin-bottom-10 {
            margin-bottom: 10px !important;
        }

        .margin-left-10 {
            margin-left: 10px;
        }

        .cursor-pointer {
            cursor: pointer;
        }

        .todo-input {
            height: 64px;
            color: #4a4a4a;
            padding-left: 24px;
            border-top-style: hidden;
            border-right-style: hidden;
            border-left-style: hidden;
            border-bottom: 2px solid #f0f0f0;
            border-radius: 0px;
            text-shadow: none;
            box-shadow: none;
        }

        .todo-input:focus {
            outline: none;
            border-bottom: 2px solid #00d1b2;
            box-shadow: none;
        }
    </style>
    <script>
      const app = Vue.createApp({
          template: "<Main/><Main2/>"
      });
      const _bs_style = Vue.reactive({
        person: {parent: {name: "Steve"}}
      })
      const mixin = {
        computed: {
          _bs_style: {
            get() {
              return _bs_style;
            }
          }
        },
      };
      app.component("Main", {
        mixins: [mixin],
        template: \`<button @click="change()">Change</button><br>{{_bs_style.person.parent.name}}\`,
        methods: {
          change() {
            this._bs_style.person.parent.name = "Tim";
          }
        }
      });
      app.component("Main2", {
        mixins: [mixin],
        template: \`<button @click="change()">Change</button><br>{{_bs_style.person.parent.name}}\`,
        methods: {
          change() {
            console.dir(this);
            console.dir(this?._bs_style);
            console.dir(this?._bs_style?.person);
            console.dir(this?._bs_style?.person?.parent);
            console.dir(this?._bs_style?.person?.parent?.name);
            this._bs_style.person.parent.name = "John";
          }
        }
      });
      /*COMPONENTS*/
      app.mount("#app");
    </script>
</body>

</html>
`;