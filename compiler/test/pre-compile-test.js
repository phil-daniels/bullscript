const preCompile = require("../src/lex");

test(`Semi-colon insertion at end of statement`,
`statement
another_statement`,
`statement;another_statement;`,
);

test(`Removal of escaped newlines`,
`statement\
another_statement`,
`statementanother_statement;`,
);

test(`Convert indents to curly braces`,
`statement
   child1
   child2
statement2`,
`statement{child1;child2;};statement2;`,
);

test(`Nested indents`,
`statement
   child1
      subchild1
         subsubchild1
   child2
      subchild2
statement2
   child3`,
`statement{child1{subchild1{subsubchild1;};};child2{subchild2};};statement2{child3;};`,
);

test(`Ignore indent immediately inside of parens`,
`statement
   child1(
  subchild1
      subsubchild1,
            subchild2
              subsubchild2
   )`,
`statement{child1(subchild1{subsubchild1;};subchild2{subsubchild2};);};`,
);

test(`Convert curlies to obj literals, ignore indent immediately inside of curlies`,
`statement
   child1{
  subchild1
      subsubchild1,
         subchild2
          subsubchild2
   }`,
`statement{child1##OBJECT##{subchild1{subsubchild1};subchild2{subsubchild2;};};};`,
);

test(`Ignore indent immediately inside of square brackets`,
`statement
   child1[
subchild1
    subsubchild1,
         subchild2
          subsubchild2
   ]`,
`statement{child1[subchild1{subsubchild1};subchild2{subsubchild2;};];};`,
);

test(`Don't remove the space after "var" keyword`,
`statement
   var outside
   child1[
      var inside
   ]
   child2
      subchild2
statement2
   child3`,
`statement{var outside;child1[var inside;];child2{subchild2};};statement2{child3;};`,
);

test(`All newlines w/in backticks are escaped`,
`statement
   child1
   var hey = \`one()
.two()
           .three()\`
   \`another_child
_ok\`
      subchild
statement2`,
`statement{child1;var hey=one().two().three();another_child_ok{subchild;};statement2;`,
);

test(`Ignore indent, parens, curlies, square brackets, escaped newlines and backticks inside of strings. Don't remove spaces.`,
`var hello = "statement
   child1
   ( [ { \`
   \
) ] }"`,
`var hello="statement
child1
( [ { \`
\
) ] }"`,
);

test(`If open quote has a newline right after, treat as template string`,
`var hello = "
  one
   subone
  two
      three"`,
`var hello="one
 subone
two
    three"`,
);

test(`If open quote has a newline w/ white space right after, treat as template string`,
`var hello = "    
  one
   subone
  two
      three"`,
`var hello="one
 subone
two
    three"`,
);

function test(desc, input, expectedOutput) {
  const output = preCompile(input);
  if (expectedOutput !== output) {
    throw new Error(desc);
  }
}