**Object Copy Operations**

*Object Patch*
var person = {name: "John", age: 8}
person #= #{name: "Ted"}
person #= name: "Ted" // #{} is optional if #= is used
person #= #{name: "Ted", age: 47} // multiple props
person #= {name: "Thomas"} // can patch w/ a normal obj
person #= #{
   age: 7
   // in a nested patch you can set a property to a patch object:
   thing: #{somePatch: true}
   // or you can specify to patch a nested object w/ #:
   parent #: #{age: 41}
}

*List Patch*
var numbers = [1, 2, 3]
numbers #= #[add(item)] // patch a list appending an item
numbers #= add(item) // #[] is optional if #= is used
numbers #= #[add(item).prepend(item2).insert(4, item3).set(5, item4)] // w/ optional outer #[]
numbers #= add(item).patch(5, #[add(item2)]).patch(6, #{name: "John"})