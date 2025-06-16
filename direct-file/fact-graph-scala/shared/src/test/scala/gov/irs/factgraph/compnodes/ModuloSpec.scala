package gov.irs.factgraph.compnodes

import gov.irs.factgraph.FactDictionary
import gov.irs.factgraph.definitions.fact.{
  CommonOptionConfigTraits,
  CompNodeConfigElement
}
import org.scalatest.funspec.AnyFunSpec
import gov.irs.factgraph.monads.Result
import gov.irs.factgraph.types.*

class ModuloSpec extends AnyFunSpec:
  describe("Modulo") {
    it("reduces Int modulo Int") {
      val node = CompNode.fromDerivedConfig(
        new CompNodeConfigElement(
          "Modulo",
          Seq(
            new CompNodeConfigElement(
              "Left",
              Seq(
                new CompNodeConfigElement(
                  "Int",
                  Seq.empty,
                  CommonOptionConfigTraits.value("5")
                )
              )
            ),
            new CompNodeConfigElement(
              "Right",
              Seq(
                new CompNodeConfigElement(
                  "Int",
                  Seq.empty,
                  CommonOptionConfigTraits.value("3")
                )
              )
            )
          )
        )
      )

      assert(node.get(0) == Result.Complete(2))
    }
  }
