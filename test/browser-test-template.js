const fs = require("fs");

const React = {
  createElement: () => {}
};

const ReactDOM = {
  createRoot: function() {
    return {
      render: () => {}
    };
  }
};

const document = {
  getElementById: () => {}
};

const $main$bs = {};

eval(`` + fs.readFileSync(`compiler/src/template/browser-template.js`));
