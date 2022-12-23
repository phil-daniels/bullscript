const bs = require("./browser-test-template.js");
const React = {}; // mock

let reactUpdated = [], actual = {}, bob, ron, tom, people, name, reactStateIndex = 0;
function populateUpdated() {
  if (reactUpdated[0]) actual["bob"] = reactUpdated[0];
  if (reactUpdated[1]) actual["ron"] = reactUpdated[1];
  if (reactUpdated[2]) actual["tom"] = reactUpdated[2];
  if (reactUpdated[3]) actual["people"] = reactUpdated[3];
}
React.useState = immObj => {
  const index = reactStateIndex++;
  return [immObj, newImmObj => reactUpdated[index] = newImmObj];
};
function stripInternalProperties(obj) {
  if (!bs.isPrimitive(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$")) delete obj[key];
      else stripInternalProperties(value);
    }
  }
  return obj;
}
function expect(expectedObj) {
  populateUpdated();
  actual = stripInternalProperties(JSON.parse(JSON.stringify(actual)));
  const actualString = JSON.stringify(actual);
  const expectedString = JSON.stringify(expectedObj);
  if (actualString !== expectedString) {
    console.error("Expected: " + expectedString);
    console.error("Actual: " + actualString);
    throw new Error("== FAILED! =");
  }
}

// State/Collection testing ====================================================

const $state_bob = bs.state(React.useState, ReaReact.useRef($component.initState("bob", bs.obj({name: "Bob"})));
$state_bob.reactSetter = React.useState()[1];
const $state_ron = React.useRef($component.initState("ron", $ => ron = $, bs.obj({name: "Ron"})));
$state_ron.reactSetter = React.useState()[1];
const $state_tom = React.useRef($component.initState("tom", $ => tom = $, bs.obj({name: "Tom", buddy: bob})));
$state_tom.reactSetter = React.useState()[1];
const $state_people = React.useRef($component.initState("people", $ => people = $, bs.arr(bob)));
$state_people.reactSetter = React.useState()[1];
const $state_name = React.useRef($component.initState("name", $ => name = $, "Tim"));
$state_name.reactSetter = React.useState()[1];
actual = {
  bob: {name: "Bob"}, // changed
  ron: {name: "Ron"},
  tom: {name: "Tom", buddy: {name: "Bob"}}, // changed
  people: [{name: "Bob"}] // changed
};
bob.$set("name", "Robert");  // should update bob and tom
expect({
  bob: {name: "Robert"}, // changed
  ron: {name: "Ron"},
  tom: {name: "Tom", buddy: {name: "Robert"}}, // changed
  people: [{name: "Robert"}] // changed
});
ron.$set("name", "Ronald");  // should update ron
expect({
  bob: {name: "Robert"},
  ron: {name: "Ronald"}, // changed
  tom: {name: "Tom", buddy: {name: "Robert"}},
  people: [{name: "Robert"}]
});
tom.$set("buddy", ron);      // should update tom
expect({
  bob: {name: "Robert"},
  ron: {name: "Ronald"},
  tom: {name: "Tom", buddy: {name: "Ronald"}}, // changed
  people: [{name: "Robert"}]
});
bob.$set("name", "Roberto"); // should updated bob
expect({
  bob: {name: "Roberto"}, // changed
  ron: {name: "Ronald"},
  tom: {name: "Tom", buddy: {name: "Ronald"}},
  people: [{name: "Roberto"}] // changed
});
ron.$set("name", "Ronaldo"); // should update ron and tom
expect({
  bob: {name: "Roberto"},
  ron: {name: "Ronaldo"}, // changed
  tom: {name: "Tom", buddy: {name: "Ronaldo"}}, // changed
  people: [{name: "Roberto"}]
});
$assign_ron(bob);
bob.$set("name", "Bobo");
expect({
  bob: {name: "Bobo"}, // changed
  ron: {name: "Bobo"}, // changed
  tom: {name: "Tom", buddy: {name: "Ronaldo"}},
  people: [{name: "Bobo"}]
});
$assign_bob(bs.obj({name: "Ted"}));
expect({
  bob: {name: "Ted"}, // changed
  ron: {name: "Bobo"},
  tom: {name: "Tom", buddy: {name: "Ronaldo"}},
  people: [{name: "Bobo"}]
});
bob.$set("name", "Bobo2");
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"}, // changed
  tom: {name: "Tom", buddy: {name: "Ronaldo"}},
  people: [{name: "Bobo2"}] // changed
});
people.add(tom);
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: "Ronaldo"}},
  people: [{name: "Bobo2"}, {name: "Tom", buddy: {name: "Ronaldo"}}] // changed
});
people.remove(bob);
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: "Ronaldo"}},
  people: [{name: "Tom", buddy: {name: "Ronaldo"}}] // changed
});
tom.buddy.name = "Jason";
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: "Jason"}}, // changed
  people: [{name: "Tom", buddy: {name: "Jason"}}] // changed
});
people[0].buddy.name = bs.arr("Bobitha", "Smithica");
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}}, // changed
  people: [{name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}}] // changed
});
people.add(bs.arr("1", "2"));
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}},
  people: [{name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}}, ["1", "2"]] // changed
});
people[1].add(bs.arr("1", "2"));
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}},
  people: [{name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}}, ["1", "2", ["1", "2"]]] // changed
});
people[1][2].add("hey");
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}},
  people: [{name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}}, ["1", "2", ["1", "2", "hey"]]] // changed
});
const savedArr = people[1];
const savedArr1 = people[1][2];
people.removeIndex(1);
expect({
  bob: {name: "Ted"},
  ron: {name: "Bobo2"},
  tom: {name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}},
  people: [{name: "Tom", buddy: {name: ["Bobitha", "Smithica"]}}] // changed
});
// make sure listener were removed (no memory leak)
if (savedArr.$listeners.length !== 0) throw new Error("Failed!");
if (savedArr1.$listeners.length !== 0) throw new Error("Failed!");