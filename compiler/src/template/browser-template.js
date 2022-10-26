(bs => {

/*BROWSER_APP_CODE !!SKIP!! */

State todo
  Prop
    Obj
      label: "hi"
      Completed: false

blah.assign(todo.label);

Obj.lable = "yo"

// all objects created in bullscript are proxies, which by default just forward to object
//     objects can be listened to for updates

// primitives are not wrapped

// can do this to get primitive as property: person.$prop("name")

Let s = "hi";
Const $prop_s = $prop(s, $v => s = $v);
Let o = {name: "John"};
Const $prop_o = $prop(s, $v => o = $v);

$tag([$prop_s]);
$tag([o.$prop("name")]);

const $main$component$bs = function($add) {
  const newTodoLabel = $state("alright");
  const todos = $state([]);
  const add = () => {
    return $pipe(null,
      $ => $append(todos, { label: newTodoLabel, completed: false }),
      $ => newTodoLabel.assign(""),
    );
  };
  $_delete = (todo) => {
    return $pipe(null,
      $ => $remove(todos, todo),
    );
  };
  markComplete = (todo) => {
    return $pipe(null,
      () => $set(todo.completed, $negate(todo.completed)),
    );
  };
  $add($tag("h1", ["todos"]));
  $add($tag("input", [newTodoLabel, ($v) => newTodoLabel.assign($v)], { onEnter: add }));
  $add($tagFor(todos, ($add, todo) => {
    $add($tag("div", ($add) => {
      $add($tag("button", ["Done"], {onClick: () => markComplete(todo)}));
      $add($tag("span", [$tagIf($expEqual(todo.completed, true), {style: {"textDecoration": " line-through"}})], {onClick: () => markComplete(todo)}));
      $add($tag("button", ["X"], {onClick: () => $_delete(todo)}));
    }));
  }));
};

{
  const root = document.getElementById('root');
  const rootTag = new $TagParent(root);
  rootTag.mainEl = root;
  rootTag.else = [root];
  $main$component$bs(rootTag.add);
}

})(typeof module !== "undefined" ? module.exports : (window.bs = {}));