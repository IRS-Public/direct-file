package gov.irs.factgraph.compnodes

import org.scalatest.funspec.AnyFunSpec
import gov.irs.factgraph.*
import gov.irs.factgraph.definitions.fact.*
import gov.irs.factgraph.monads.Result
import gov.irs.factgraph.types.Tin

class TinNodeSpec extends AnyFunSpec:
  describe("TinNode") {
    describe("$apply") {
      it("creates nodes from values") {
        val node = TinNode(Tin("999-99-0000"))
        assert(node.get(0) == Result.Complete(Tin("999-99-0000")))
      }
    }

    describe(".switch") {
      it("can be used inside a switch statement") {
        val config = new CompNodeConfigElement(
          "Switch",
          Seq(
            new CompNodeConfigElement(
              "Case",
              Seq(
                new CompNodeConfigElement(
                  "When",
                  Seq(new CompNodeConfigElement("False"))
                ),
                new CompNodeConfigElement(
                  "Then",
                  Seq(
                    CompNodeConfigElement(
                      "TIN",
                      Seq.empty,
                      CommonOptionConfigTraits.value("999-99-0000")
                    )
                  )
                )
              )
            ),
            new CompNodeConfigElement(
              "Case",
              Seq(
                new CompNodeConfigElement(
                  "When",
                  Seq(new CompNodeConfigElement("True"))
                ),
                new CompNodeConfigElement(
                  "Then",
                  Seq(
                    CompNodeConfigElement(
                      "TIN",
                      Seq.empty,
                      CommonOptionConfigTraits.value("999-99-0001")
                    )
                  )
                )
              )
            )
          )
        )
        val node = CompNode.fromDerivedConfig(config)

        assert(node.get(0) == Result.Complete(Tin("999-99-0001")))
      }
    }

    describe(".dependency") {
      val dictionary = FactDictionary()

      FactDefinition.fromConfig(
        FactConfigElement(
          "/value",
          None,
          Some(
            new CompNodeConfigElement(
              "TIN",
              Seq.empty,
              CommonOptionConfigTraits.value("999-99-0000")
            )
          ),
          None
        )
      )(using dictionary)

      FactDefinition.fromConfig(
        FactConfigElement(
          "/dependent",
          None,
          Some(
            new CompNodeConfigElement(
              "Dependency",
              Seq.empty,
              CommonOptionConfigTraits.path("../value")
            )
          ),
          None
        )
      )(using dictionary)

      val graph = Graph(dictionary)
      val dependent = graph(Path("/dependent"))(0).get

      it("can be depended on by another fact") {
        assert(dependent.value.isInstanceOf[TinNode])
        assert(dependent.get(0) == Result.Complete(Tin("999-99-0000")))
      }
    }

    describe(".fromExpression") {
      it("can create a new node with an expression") {
        val node = TinNode(Expression.Constant(None), false)
        val newNode =
          node.fromExpression(Expression.Constant(Some(Tin("999-99-0000"))))

        assert(newNode.get(0) == Result.Complete(Tin("999-99-0000")))
      }
    }

    describe("$writablefromDerivedConfig") {
      it("can read and write a value") {
        val dictionary = FactDictionary()
        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement("TIN")
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val fact = graph(Path("/test"))(0).get

        assert(fact.get(0) == Result.Incomplete)

        fact.set(Tin("999-99-0000"))
        graph.save()

        assert(fact.get(0) == Result.Complete(Tin("999-99-0000")))
      }
      it("accepts an argument allowing TINs that are all 0's") {
        // On W-2s, if a filer hasn't received a TIN by the time the W-2 is
        // printed, the W-2 might have an SSN of 000-00-0000, so we have a flag
        // to allow that
        val dictionary = FactDictionary()
        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement(
                "TIN",
                CommonOptionConfigTraits.allowAllZeros("true")
              )
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val fact = graph(Path("/test"))(0).get

        assert(fact.get(0) == Result.Incomplete)

        fact.set(Tin("000-00-0000", true))
        graph.save()

        assert(fact.get(0) == Result.Complete(Tin("000-00-0000", true)))
      }
    }
    describe("isITIN") {
      it("can be gathered as a bool") {
        val dictionary = FactDictionary()

        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement("TIN")
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val incomplete = graph(Path("/test/isITIN"))(0).get
        assert(incomplete.get(0) == Result.Incomplete)

        val fact = graph(Path("/test"))(0).get
        fact.set(Tin("900-80-0001"))
        graph.save()
        val isITIN = graph(Path("/test/isITIN"))(0).get
        assert(isITIN.get(0) == Result.Complete(true))
      }
      it("can be change values") {
        val dictionary = FactDictionary()

        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement("TIN")
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val fact = graph(Path("/test"))(0).get
        fact.set(Tin("900-80-0001"))
        graph.save()
        var isITIN = graph(Path("/test/isITIN"))(0).get
        assert(isITIN.get(0) == Result.Complete(true))

        fact.set(Tin("900-89-0001"))
        graph.save()
        isITIN = graph(Path("/test/isITIN"))(0).get
        assert(isITIN.get(0) == Result.Complete(false))
      }
    }

    describe("isSSN") {
      it("can be gathered as a bool") {
        val dictionary = FactDictionary()

        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement("TIN")
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val incomplete = graph(Path("/test/isSSN"))(0).get
        assert(incomplete.get(0) == Result.Incomplete)

        val fact = graph(Path("/test"))(0).get
        fact.set(Tin("200-80-0001"))
        graph.save()
        val isSSN = graph(Path("/test/isSSN"))(0).get
        assert(isSSN.get(0) == Result.Complete(true))
      }
      it("can be change values") {
        val dictionary = FactDictionary()

        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement("TIN")
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val fact = graph(Path("/test"))(0).get
        fact.set(Tin("200-80-0001"))
        graph.save()
        var isSSN = graph(Path("/test/isSSN"))(0).get
        assert(isSSN.get(0) == Result.Complete(true))

        // if it starts with 9, result is false
        fact.set(Tin("901-89-0001"))
        graph.save()
        isSSN = graph(Path("/test/isSSN"))(0).get
        assert(isSSN.get(0) == Result.Complete(false))

        // if it ends with 4 zeros, result is false
        fact.set(Tin("800-89-0000"))
        graph.save()
        isSSN = graph(Path("/test/isSSN"))(0).get
        assert(isSSN.get(0) == Result.Complete(false))
      }
    }

    describe("isATIN") {
      it("can be gathered as a bool") {
        val dictionary = FactDictionary()

        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement("TIN")
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val incomplete = graph(Path("/test/isATIN"))(0).get
        assert(incomplete.get(0) == Result.Incomplete)

        val fact = graph(Path("/test"))(0).get
        fact.set(Tin("999-93-0001"))
        graph.save()
        val isATIN = graph(Path("/test/isATIN"))(0).get
        assert(isATIN.get(0) == Result.Complete(true))
      }
      it("can be change values") {
        val dictionary = FactDictionary()

        FactDefinition.fromConfig(
          FactConfigElement(
            "/test",
            Some(
              new WritableConfigElement("TIN")
            ),
            None,
            None
          )
        )(using dictionary)

        val graph = Graph(dictionary)
        val fact = graph(Path("/test"))(0).get
        fact.set(Tin("999-93-0001"))
        graph.save()
        var isATIN = graph(Path("/test/isATIN"))(0).get
        assert(isATIN.get(0) == Result.Complete(true))

        fact.set(Tin("899-93-0001"))
        graph.save()
        isATIN = graph(Path("/test/isATIN"))(0).get
        assert(isATIN.get(0) == Result.Complete(false))
      }
    }
  }
