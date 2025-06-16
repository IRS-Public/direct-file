package gov.irs.factgraph.compnodes

import gov.irs.factgraph.{Expression, FactDictionary, Factual}
import gov.irs.factgraph.definitions.fact.CompNodeConfigTrait
import gov.irs.factgraph.operators.BinaryOperator

object Modulo extends CompNodeFactory:
  override val Key: String = "Modulo"

  private val operator = ModuloOperator()

  def apply(lhs: CompNode, rhs: CompNode): IntNode = (lhs, rhs) match
    case (l: IntNode, r: IntNode) =>
      IntNode(
        Expression.Binary(
          l.expr,
          r.expr,
          operator,
        ),
      )
    case _ =>
      throw new UnsupportedOperationException(
        s"cannot modulate a ${lhs.getClass.getName} and a ${rhs.getClass.getName}",
      )

  override def fromDerivedConfig(e: CompNodeConfigTrait)(using Factual)(using
      FactDictionary,
  ): CompNode =
    val lhs = CompNode.getConfigChildNode(e, "Left")
    val rhs = CompNode.getConfigChildNode(e, "Right")

    this(lhs, rhs)

private final class ModuloOperator extends BinaryOperator[Int, Int, Int]:
  override protected def operation(x: Int, y: Int): Int = x % y
