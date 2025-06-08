package gov.irs.factgraph.types

import java.lang.{Enum => JavaEnum}
import scala.scalajs.js.annotation.{JSExport, JSExportAll, JSExportTopLevel}
import scala.util.matching.Regex
import scala.util.{Try, Success, Failure}

import gov.irs.factgraph.monads.JSEither
import gov.irs.factgraph.validation.{ValidationFailure, ValidationFailureReason}

// NOTE: These classes and types are specified just to simplify some front-end logistics
// This pattern may need some reconsideration to minimize boilerplate

@JSExportAll
enum MultiEnumFailureReason extends JavaEnum[MultiEnumFailureReason], ValidationFailureReason:
  type UserFriendlyReason = MultiEnumFailureReason
  case BlankEnum
  case InvalidEnum

  def toUserFriendlyReason() =
    this // Error reason is already user friendly

@JSExportAll
final case class MultiEnumValidationFailure(
    private val message: String = "",
    private val cause: Throwable = None.orNull,
    val validationMessage: MultiEnumFailureReason,
) extends IllegalArgumentException(message, cause),
      ValidationFailure[MultiEnumFailureReason];

object MultiEnumFactory:
  @JSExportTopLevel("MultiEnumFactory")
  def apply(
      value: Set[String],
      enumOptionsPath: String,
  ): JSEither[MultiEnumValidationFailure, MultiEnum] =
    Try(new MultiEnum(value, enumOptionsPath)) match
      case Success(v) => JSEither.Right(v)
      case Failure(exception) =>
        JSEither.Left(
          MultiEnumValidationFailure(
            "Failed to initialize multiEnum",
            None.orNull,
            MultiEnumFailureReason.InvalidEnum,
          ),
        )
