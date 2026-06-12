import gov.irs.factgraph.{FactDictionary, Graph}
import gov.irs.factgraph.persisters.InMemoryPersister

// #######################
// ##  2. Completeness  ##
// #######################
//
// Let's create another FactDictionary.

val dictionary = FactDictionary.fromXml(
  <Dictionary>
    <Fact path="/factA">
      <Writable><Boolean /></Writable>
    </Fact>

    <Fact path="/factB">
      <Writable><Boolean /></Writable>
    </Fact>

    <Fact path="/factC">
      <Writable><Boolean /></Writable>
    </Fact>

    <Fact path="/conclusion">
      <Derived>
        <All>
          <Dependency path="../factA" />
          <Dependency path="../factB" />
          <Dependency path="../factC" />
        </All>
      </Derived>
    </Fact>
  </Dictionary>
)

// Instead of using Dollar amounts, our Facts are now Boolean (true/false)
// values. And instead of our Derived Fact performing an Add operation, it now
// performs an All. As you might expect, the conclusion is true if all of facts
// A–C are true.

val graph = Graph(
  dictionary,
  InMemoryPersister(
    "/factA" -> true,
    "/factB" -> true,
    "/factC" -> false
  )
)

graph.get("/conclusion")

// If you're familiar with tax concepts, you probably have some ideas for how
// the All operation might be useful to us. For example, in order to claim a
// child as a dependent, they must pass six tests. In other words, if six Facts
// are all true, a Fact representing the dependent's claimability is also true.
//
// In the previous chapter, we described a Fact Graph as a declarative way of
// applying complex rules to _partial_ information entered by a user. Thus far,
// we have only looked at Fact Graphs where all of the Facts are known. Let's
// change that.

graph.delete("/factC")
graph.save()

graph.get("/factC")

// Pop quiz: now that fact C is incomplete, what should the value of the
// conclusion be?
//
// Hint: there are no wrong answers.
//
// You might argue that the conclusion should be false. We said above that the
// conclusion is true if all of its children are true, and fact C is missing,
// not true; therefore not all of the children are true, and the conclusion
// should be false.
//
// You might argue that the conclusion should be incomplete. The problem is our
// lack of omniscience. Fact C represents a truth observable in the real world,
// and thus the real value of the conclusion is knowable; it's just not known to
// us. Until we have full knowledge, we should report that we don't know.
//
// You might even argue that the conclusion should be true, given that at least
// the set of facts that we know thus far are all true.
//
// All of these possibilities are valid. Indeed, as a taxpayer completes a tax
// return, we'll want the All operation to adopt each of these behaviors in
// various situations.
//
// For example, we might imagine presenting the taxpayer with a running tally of
// refund owed or balance due. There will be a set of tax credits for which we
// have not yet determined the taxpayer's eligibility. In this case, it would be
// far better to assume the taxpayer is ineligible until we can conclusively
// prove their eligibility, rather than presuming eligibility and taking credits
// away from the taxpayer one by one.
//
// Conversely, we might imagine a Fact that represents whether the taxpayer's
// situation is in scope for the product. Here, we want to presume exactly the
// opposite, that the taxpayer is indeed eligible to use the product until we
// identify some circumstance that the tool does not support.
//
// This ambiguity is a signal that we have not fully understood the problem at
// hand. A Fact Graph is not just calculating values; it is also calculating
// _completeness_. Let's check the value of our conclusion.

graph.get("/conclusion")

// As you can see, we default to reporting that the value of the result is
// missing ("???"). This result is also, as should be expected, marked as
// incomplete. But because we have separated these concepts of value and
// completeness, we could have instead defined the Fact as:

<Fact path="/conclusion">
  <Derived>
    <All>
      <Dependency path="../factA" />
      <Dependency path="../factB" />
      <Dependency path="../factC" />
    </All>
  </Derived>
  <Placeholder><False /></Placeholder>
</Fact>

// Note the addition of a Placeholder tag. If you like, you can update the
// FactDictionary with this revised definition. If you do, we'll see that the
// result of the conclusion has changed:

// graph.get("/conclusion") // : Result[Any] = Result(false, incomplete)

// The conclusion is still incomplete, but instead of "???," it now has the
// value of false. This would allow us to calculate other Facts using this
// value, although those Facts would also be marked as incomplete if they rely
// on the placeholder value.
//
// Let's try one final example to bring it home.

graph.set("/factB", false)
graph.save()

// Keeping in mind that fact C is still incomplete, what would we expect the
// result of the conclusion to be? Let's check it out.

graph.get("/conclusion")

// Unsurprisingly, the value is false. But more significantly, despite fact C
// still being missing, the result is now complete. This makes sense if we think
// about whether the value of fact C could affect the result. Now that fact B is
// false, the value of fact C no longer matters; no matter what, the children of
// the All operation cannot all be true.
//
// We can even take it one step further and erase fact A as well.

graph.delete("/factA")
graph.save()

graph.get("/conclusion")

// It doesn't matter! Take a moment and consider how this might be useful in the
// context of a tax return.
//
// There is a vast quantity of information that could potentially affect an
// individual's taxes. An effective tax filing product will need to be able to
// determine what information is relevant, and what is not. We will want to only
// ask questions that are relevant, that is to say, that could affect your taxes
// one way or another. The moment that we knew that fact B was false, facts A
// and C ceased to have any relevance, at least to our conclusion fact.
//
// The concepts of relevance and completeness are inextricable. You might
// imagine an interface where each question contains a set of rules to
// conditionally select the next question to present to the user. But this
// interface would be incredibly fragile and difficult to maintain. And it would
// risk the user reaching a state where they have not been asked for information
// that is necessary to finish their tax return.
//
// On the other hand, imagine an interface that looks to the Fact Graph to
// determine the relevance of a question. We can describe the goal of asking
// about facts A, B, and C as to inform the conclusion. And if the interface
// ever sees...

graph.get("/conclusion").complete

// ...it knows that it has sufficient information to draw a conclusion, and it
// does't need to ask additional questions.
//
// Now that we've explored boolean logic a bit, the next chapter will dive into
// numbers and numeric operations.
