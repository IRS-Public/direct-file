package gov.irs.factgraph.types
import java.lang.{Enum => JavaEnum}
import gov.irs.factgraph.validation.{ValidationFailure, ValidationFailureReason}
import gov.irs.factgraph.monads.JSEither
import scala.scalajs.js.annotation.{JSExport, JSExportAll, JSExportTopLevel}
import scala.scalajs.js
import gov.irs.factgraph.compnodes.{StripChars}

enum StringFailureReason extends JavaEnum[StringFailureReason], ValidationFailureReason:
  type UserFriendlyReason = StringFailureReason
  case InvalidCharacters
  case InvalidEmployerNameLine2Characters
  case InvalidEmployerNameLine1Characters
  case InvalidCharactersNoNumbers
  case InvalidCharactersNumbersOnly
  case InvalidForm1099rBox7Codes
  case InvalidForm1099rBox11Year
  case InvalidMefRatioType

  def toUserFriendlyReason() =
    this // Error reason is already user friendly

@JSExportAll
final case class StringValidationFailure(
    private val message: String = "",
    private val cause: Throwable = None.orNull,
    val validationMessage: StringFailureReason,
) extends IllegalArgumentException(message, cause),
      ValidationFailure[StringFailureReason];

// TODO: This basically replicates the logic of the actual limit processing
// to be able raise the validation on a field. This needs a big refactor
object StringFactory:
  val DefaultNamePattern = "[\\sA-Za-z0-9\\-]+"
  val DefaultNamePatternNoNumbers = "[\\sA-Za-z\\-]+"
  val EmployerNameLine1Pattern =
    "(([A-Za-z0-9#\\-\\(\\)]|&|')\\s?)*([A-Za-z0-9#\\-\\(\\)]|&|')"
  val EmployerNameLine2Pattern =
    "(([A-Za-z0-9#/%\\-\\(\\)]|&|')\\s?)*([A-Za-z0-9#/%\\-\\(\\)]|&|')"
  val NumbersOnlyPattern = "[0-9]+"
  val Form1099rBox7CodesPattern = "([A-HJ-NP-UWa-hj-np-uw1-9])(?!\\1)[A-HJ-NP-UWa-hj-np-uw1-9]?"
  val Form1099rBox11YearPattern = "[1-2][0-9][0-9][0-9]"
  val MefRatioTypeAsPercentPattern = "^100(\\.0{1,3})?|[0-9]{1,2}(\\.\\d{1,3})?$"

  def checkMatch(
      input: String,
      maybePattern: js.UndefOr[String] = js.undefined,
  ): JSEither[StringValidationFailure, String] =

    /*
    Define a map of patterns to error messages. These were obtained from what was sent to LimitString
    on the client side
     */
    val patternValidationMappings = Map(
      EmployerNameLine2Pattern -> (
        "Invalid characters for Employer Name field",
        StringFailureReason.InvalidEmployerNameLine2Characters,
      ),
      EmployerNameLine1Pattern -> (
        "Invalid characters for Employer Name field",
        StringFailureReason.InvalidEmployerNameLine1Characters,
      ),
      DefaultNamePattern -> (
        "Invalid characters",
        StringFailureReason.InvalidCharacters,
      ),
      DefaultNamePatternNoNumbers -> (
        "Invalid characters",
        StringFailureReason.InvalidCharactersNoNumbers,
      ),
      NumbersOnlyPattern -> (
        "Invalid characters, numbers only",
        StringFailureReason.InvalidCharactersNumbersOnly,
      ),
      Form1099rBox7CodesPattern -> (
        "Invalid characters, only form 1099-R box 7 codes",
        StringFailureReason.InvalidForm1099rBox7Codes,
      ),
      Form1099rBox11YearPattern -> (
        "Invalid characters, only valid 4-digit year",
        StringFailureReason.InvalidForm1099rBox11Year,
      ),
      MefRatioTypeAsPercentPattern -> (
        "Invalid characters for percentage field",
        StringFailureReason.InvalidMefRatioType,
      ),
    )

    maybePattern.toOption match
      case Some(pattern) =>
        if (pattern.r.matches(input)) {
          JSEither.Right(input)
        } else {
          patternValidationMappings.get(pattern) match {
            case Some((errorMessage, failureReason)) =>
              JSEither.Left(
                StringValidationFailure(
                  errorMessage,
                  None.orNull,
                  failureReason,
                ),
              )
            case None =>
              // Default error message and failure reason if pattern not found
              JSEither.Left(
                StringValidationFailure(
                  "Invalid characters",
                  None.orNull,
                  StringFailureReason.InvalidCharacters,
                ),
              )
          }
        }
      case None => JSEither.Right(input)

  @JSExportTopLevel("StringFactory")
  def apply(
      s: String,
      pattern: js.UndefOr[String] = js.undefined,
  ): JSEither[StringValidationFailure, String] =
    checkMatch(s, pattern)

  @JSExportTopLevel("stripDisallowedCharacters")
  def stripDisallowedCharacters(input: String, allow: String): String =
    StripChars.strip(input, allow)
