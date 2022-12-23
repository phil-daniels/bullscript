
//== App =====================================

/*BROWSER_APP_CODE !!SKIP!! */

// const $bs_main$bs = function($bs_add) {
  
  

//   /*
// var count = Math.floor(Math.random() * 10)
// var activities = for (0..count) httpGet("http://www.boredapi.com/api/activity/")?.activity
// fn displayUser(user) ->
//    console.log("
//       {genderSign} \
//       name: {user.name.title} {user.name.first} {user.name.last} \
//       of {user.location.city} {user.location.state}
//    ")
// for (activity in activities)
//    var user = httpGet("https://randomuser.me/api/")?.results?[0]
//    if (user.name.first.contains("e"))
//       console.log("skipping {user.name.first} because it contains an \"e\"")
//    else
//       var genderSign = if (user.gender == "female") "♀" else "♂"
//       console.log("activity: {activity}")
//       displayUser(user)
//    console.log("")
// */

//   const component = $bs.component();
//   let newTodoLabel, todos;
//   const $bs_newTodoLabel = component.$bs_state(() => {
//     return $bs.pipe(null,
//       () => "alright",
//     );
//   }, $bs_v => newTodoLabel = $bs_v);
//   const $bs_todos = component.$bs_state(() => {
//     return $bs.pipe(null,
//       () => $bs.obj([]),
//     );
//   }, $bs_value => todos = $bs_value);
//   const add = () => {
//     return $bs.pipe(null,
//       $ => $bs.append($bs_todos, { label: newTodoLabel, completed: false }),
//       $ => newTodoLabel.set(""),
//     );
//   };
//   $bs_esc_delete = (todo) => {
//     return $bs.pipe(null,
//       $ => $bs.remove(todos, todo),
//     );
//   };
//   markComplete = (todo) => {
//     return $bs.pipe(null,
//       () => todo.completed = !todo.completed,
//     );
//   };
//   $bs_add($bs.tag("h1", ["todos"]));
//   $bs_add($bs.tag("input", [$bs_newTodoLabel, ($bs_v) => $bs_newTodoLabel.set($bs_v)], { onEnter: add }));
//   $bs_add($bs.tagFor($bs_todos, ($bs_add, todo) => {
//     $bs_add($bs.tag("div", ($bs_add) => {
//       $bs_add($bs.tag("button", ["Done"], {onClick: () => markComplete(todo)}));
//       $bs_add($bs.tag("span", [$bs.if($bs.equals($bs.ref(todo, "completed"), true), {style: ["textDecoration: line-through"]}), $bs.ref(todo, "label")], {onClick: () => markComplete(todo)}));
//       $bs_add($bs.tag("button", ["X"], {onClick: () => $bs_esc_delete(todo)}));
//     }));
//   }));
// };

// {
//   const root = document.getElementById('root');
//   const rootTag = new $bs.TagParent(root);
//   rootTag.mainEl = root;
//   rootTag.els = [root];
//   $bs_main$bs(rootTag.add);
// }