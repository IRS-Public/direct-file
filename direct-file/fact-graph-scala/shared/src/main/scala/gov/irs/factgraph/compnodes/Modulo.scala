 package gov.irs.factgraph.compnodes

import gov.irs.factgraph.{Expression, FactDictionary, Factual}
import gov.irs.factgraph.definitions.fact.CompNodeConfigTrait
import gov.irs.factgraph.operators.BinaryOperator

object Modulo extends CompNodeFactory:
  override val Key: String = "Modulo"

  private val operator = ModuloOperator()

  def apply(lhs: CompNode, rhs: CompNode): BooleanNode =
    if (lhs.getClass != rhs.getClass)
      throw new UnsupportedOperationException(
        s"cannot modulate a ${lhs.getClass.getName} and a ${rhs.getClass.getName}",
      )

    BooleanNode(
      Expression.Binary(
        lhs.expr,
        rhs.expr,
        operator,
      ),
    )

  override def fromDerivedConfig(e: CompNodeConfigTrait)(using Factual)(using
      FactDictionary,
  ): CompNode =
    val lhs = CompNode.getConfigChildNode(e, "Left")
    val rhs = CompNode.getConfigChildNode(e, "Right")

    this(lhs, rhs)

private final class ModuloOperator extends BinaryOperator[Boolean, Any, Any]:
  override protected def operation(x: Any, y: Any): Boolean = x % y