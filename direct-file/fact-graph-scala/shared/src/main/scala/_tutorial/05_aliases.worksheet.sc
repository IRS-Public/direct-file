import gov.irs.factgraph.{FactDictionary, Graph}
import gov.irs.factgraph.persisters.InMemoryPersister
import gov.irs.factgraph.types.{Collection, CollectionItem, Dollar}
import java.util.UUID

// ###################################################
// ##  5. Aliased Collections and Collection Items  ##
// ###################################################
//
// In the last chapter, we described Collections and CollectionItems as Facts
// with special properties. In this chapter, we'll explore some more of those
// special properties, and also look at how we can operate on Collections and
// CollectionItems same as we would any other Fact.
//
// As we often do, let's start by building a FactDictionary with some examples.

val dictionary = FactDictionary.fromXml(
  <Dictionary>
    <Fact path="/filers">
      <Writable><Collection /></Writable>
    </Fact>

    <Fact path="/filers/*/firstName">
      <Writable><String /></Writable>
    </Fact>

    <Fact path="/filers/*/isPrimaryFiler">
      <Writable><Boolean /></Writable>
    </Fact>

    <Fact path="/formW2s">
      <Writable><Collection /></Writable>
    </Fact>

    <Fact path="/formW2s/*/filer">
      <Writable><CollectionItem collection="/filers" /></Writable>
    </Fact>

    <Fact path="/formW2s/*/wagesTipsOtherComp">
      <Writable><Dollar /></Writable>
    </Fact>

    <Fact path="/primaryFiler">
      <Derived>
        <Find path="/filers">
          <Dependency path="isPrimaryFiler" />
        </Find>
      </Derived>
    </Fact>

    <Fact path="/primaryFilerW2s">
      <Derived>
        <Filter path="/formW2s">
          <Dependency path="filer/isPrimaryFiler" />
        </Filter>
      </Derived>
    </Fact>

    <Fact path="/primaryFilerWagesTipsOtherComp">
      <Derived>
        <Sum>
          <Dependency path="/primaryFilerW2s/*/wagesTipsOtherComp" />
        </Sum>
      </Derived>
    </Fact>
  </Dictionary>
)

val filerId1 = UUID.randomUUID()
val filerId2 = UUID.randomUUID()

val w2Id1 = UUID.randomUUID()
val w2Id2 = UUID.randomUUID()
val w2Id3 = UUID.randomUUID()

val graph = Graph(
  dictionary,
  InMemoryPersister(
    "/filers" -> Collection(Vector(filerId1, filerId2)),
    "/formW2s" -> Collection(Vector(w2Id1, w2Id2, w2Id3)),
    s"/filers/#$filerId1/firstName" -> "Alice",
    s"/filers/#$filerId2/firstName" -> "Bob",
    s"/filers/#$filerId1/isPrimaryFiler" -> true,
    s"/filers/#$filerId2/isPrimaryFiler" -> false,
    s"/formW2s/#$w2Id1/wagesTipsOtherComp" -> Dollar("25000.00"),
    s"/formW2s/#$w2Id2/wagesTipsOtherComp" -> Dollar("50000.00"),
    s"/formW2s/#$w2Id3/wagesTipsOtherComp" -> Dollar("100000.00")
  )
)

// Take a look at the "/formW2s/*/filer" fact. What do you think it does?

<Fact path="/formW2s/*/filer">
  <Writable><CollectionItem collection="/filers" /></Writable>
</Fact>

// This CollectionItem is an alias. It allows us to store a reference to an item
// in the filers Collection, in this case, denoting the filer to whom the W2
// belongs. We can follow this alias, and access facts that are children of the
// referenced CollectionItem.

graph.get(s"/formW2s/#$w2Id1/filer")
graph.get(s"/formW2s/#$w2Id1/filer/firstName")

// Because the filer fact is incomplete, we don't know which firstName is being
// referenced, and so firstName is also incomplete, even though all of the
// firstName facts themselves are defined. Let's fix that by attaching each W2
// to a filer.

graph.set(s"/formW2s/#$w2Id1/filer", CollectionItem(filerId2))
graph.set(s"/formW2s/#$w2Id2/filer", CollectionItem(filerId1))
graph.set(s"/formW2s/#$w2Id3/filer", CollectionItem(filerId1))
graph.save()

graph.get(s"/formW2s/#$w2Id1/filer/firstName")

// As you might expect, just as we can have a Writable CollectionItem, we can
// also define a Derived CollectionItem alias. The primaryFiler fact does
// exactly that.

<Fact path="/primaryFiler">
  <Derived>
    <Find path="/filers">
      <Dependency path="isPrimaryFiler" />
    </Find>
  </Derived>
</Fact>

graph.get("/primaryFiler/firstName")

// Note that the scope of the Dependency is different than we've seen before:
// it's relative to the CollectionItem that we're checking, not to the location
// of the primaryFiler fact.
//
// We can also have Derived Collections.

<Fact path="/primaryFilerW2s">
  <Derived>
    <Filter path="/formW2s">
      <Dependency path="filer/isPrimaryFiler" />
    </Filter>
  </Derived>
</Fact>

graph.get("/primaryFilerW2s")

// Here we have an aliased Collection, where the predicate is following an
// aliased CollectionItem to determine whether to include the W2. Around and
// around it goes.
//
// Even though they are aliases, we can use these Derived Collections and
// CollectionItems as we would any other.

<Fact path="/primaryFilerWagesTipsOtherComp">
  <Derived>
    <Sum>
      <Dependency path="/primaryFilerW2s/*/wagesTipsOtherComp" />
    </Sum>
  </Derived>
</Fact>

graph.get("primaryFilerWagesTipsOtherComp")

// In the next chapter, we'll go deeper on navigating the Fact Graph.
