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
        template: "<Main/>"
      });
      const {
        createElementVNode: _createElementVNode,
        renderList: _renderList,
        Fragment: _Fragment,
        openBlock: _openBlock,
        createElementBlock: _createElementBlock,
        toDisplayString: _toDisplayString
      } = Vue;
      const _hoisted_1 = /*#__PURE__*/_createElementVNode("h1", null, "Hey man", -1 /* HOISTED */)
      app.component("Main", {
        render: function(_ctx, _cache) {
          return (
            _openBlock(),
            _createElementBlock(
              _Fragment, null, [
                _hoisted_1,
                (
                  _openBlock(true),
                  _createElementBlock(
                    _Fragment,
                    null,
                    _renderList(
                      _ctx.nums, (num) => {
                        return (
                          _openBlock(),
                          _createElementBlock("ol", null, _toDisplayString(num), 1 /* TEXT */)
                        )
                      }
                    ),
                    256 /* UNKEYED_FRAGMENT */
                  )
                )
              ],
              64 /* STABLE_FRAGMENT */
            )
          )
        },
        data: function() {
          return {nums: [1, 2, 3]};
        }
      });
      app.mount("#app");
    </script>
</body>

</html>
`;