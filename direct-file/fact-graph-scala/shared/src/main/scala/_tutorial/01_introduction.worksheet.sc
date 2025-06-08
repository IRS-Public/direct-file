import gov.irs.factgraph.{FactDictionary, Graph}
import gov.irs.factgraph.persisters.InMemoryPersister
import gov.irs.factgraph.types.Dollar

// ###############################
// ##  1. What's a Fact Graph?  ##
// ###############################
//
// Take a look at [Form 1040][1]. Line 12c asks the taxpayer to add lines 12a
// and 12b. This is a common pattern on tax forms.
//
// [1]: https://www.irs.gov/pub/irs-pdf/f1040.pdf
//
// There is a relationship between lines 12a, 12b, and 12c. In order to know what
// should be entered in 12c, we need to first know the values of 12a and 12b.
//
// This pattern might remind you of a spreadsheet. If we were to transcribe Form
// 1040 into Excel, we might imagine that line 12c would be a formula like
// =SUM(Line12A,Line12B). Excel spreadsheets are _declarative_, which is to say
// we define the relationships between cells using formulas, but we leave it up
// to Excel to determine how to solve the spreadsheet.
//
// Excel models the relationships between cells as a _directed acyclic graph_
// (DAG). "Directed" means that the relationships are one way: the fact that
// line 12c references line 12a does not affect the value 12a. "Acyclic" means
// that these references can never form a loop: if the value of line 12a were to
// depend on line 12c while 12c depends on 12a, Excel wouldn't know where to
// start solving the spreadsheet; indeed, it would show an error.
//
// A Fact Graph is a declarative way of applying a complex set of rules, like
// tax law, to partial information entered by a user. A Fact Graph is a DAG,
// just like Excel. Instead of calling the vertices of the DAG "cells," we'll
// call them "facts."
//
// Let's take the example of lines 12a–c from Form 1040. First, we'll create a
// FactDictionary to define our facts.

val dictionary = FactDictionary.fromXml(
  <Dictionary>
    <Fact path="/line12a">
      <Writable><Dollar /></Writable>
    </Fact>

    <Fact path="/line12b">
      <Writable><Dollar /></Writable>
    </Fact>

    <Fact path="/line12c">
      <Derived>
        <Add>
          <Dependency path="../line12a" />
          <Dependency path="../line12b" />
        </Add>
      </Derived>
    </Fact>
  </Dictionary>
)

// Lines 12a and 12b are Writable Facts. Each of these Facts stores a
// user-entered value, in this case a Dollar amount.
//
// Line 12c is a Derived Fact. It adds lines 12a and 12b. As you might expect,
// it also holds a Dollar amount; we don't need to specify that it is a Dollar
// because the Fact Graph infers this from the definition.
//
// Let's hook up this FactDictionary in a new Graph.

val graph = Graph(
  dictionary,
  InMemoryPersister(
    "/line12a" -> Dollar("12550.00"),
    "/line12b" -> Dollar("300.00")
  )
)

// We've provided the Graph with a Persister seeded with values for lines 12a
// and 12b. As a result, we're all set to ask our Graph for an answer to the
// value of line 12c.

graph.get("/line12c")

// Voila! Our first Fact Graph!
//
// Okay, so this is pretty basic. But from Facts just like this, we'll be able
// to represent a system as complex as the Internal Revenue Code.
//
// (It's also worth noting that a real Fact Graph wouldn't ask the user to
// specify the value of line 12a, for example. 12a would itself be a Derived
// Fact, drawing from the taxpayer's filing status, age, etc. A real Fact Graph
// would describe a quite deeply nested tree of Facts.)
//
// You may notice that the value of line 12c is wrapped in something called a
// Result, and it's marked as "complete." This is a key concept of the Fact
// Graph, as we'll explore in the next chapter.
