import gov.irs.factgraph.{Factual, FactDictionary, Graph}
import gov.irs.factgraph.compnodes.CompNode
import gov.irs.factgraph.persisters.InMemoryPersister
import gov.irs.factgraph.types.Dollar

// ##################
// ##  3. Numbers  ##
// ##################
//
// The core Fact Graph library supports three numeric types.
//
//   * Int. A 32-bit signed integer.
//   * Rational. The ratio of two integers, i.e. x/y. We will represent whole
//     percentages as a Rational with a denominator of 100.
//   * Dollar. An opaque wrapper over Java's BigDecimal type, with operations
//     rounding to two decimal places using HALF_EVEN mode, i.e. rounding half
//     cents to the nearest even cent (also known as banker's rounding).
//     Rounding a Dollar amount to a whole number of dollars uses HALF_UP mode,
//     where 50 cents is rounded up, per IRS guidance.
//
// Numeric comparisons (GreaterThan, GreaterThanOrEqual, LessThan, and
// LessThanOrEqual) require both left- and right-hand sides to be of the same
// numeric type, as do Equal and NotEqual, as well as the numeric min/max
// operations GreaterOf and LesserOf.
//
// However, the arithmatic operations (Add, Subtract, Multiple, and Divide) can
// take any combination of numeric types. The type of the output can be found
// using the following tables:
//
// When adding, subtracting, or multiplying:
//
// |          || Int         | Rational    | Dollar |
// | -------- || ----------- | ----------- | ------ |
// | Int      || Int         | Rational[1] | Dollar |
// | Rational || Rational[1] | Rational    | Dollar |
// | Dollar   || Dollar      | Dollar      | Dollar |
//
// When dividing:
//
// |          || Int        | Rational | Dollar |
// | -------- || ---------- | -------- | ------ |
// | Int      || _Rational_ | Rational | Dollar |
// | Rational || Rational   | Rational | Dollar |
// | Dollar   || Dollar     | Dollar   | Dollar |
//
// [1] Adding or subtracting two Rationals with the same denominator will
// preserve the value of the denominator. Other operations will simplify the
// resulting fraction, if possible.
//
// Let's take a look at an example.

given Factual = null
// Note: Because we're using a CompNode outside of a Fact, we need to provide
// this contextual parameter.

CompNode
  .fromXml(
    <Divide>
      <Dividend>
        <Int>1</Int>
      </Dividend>
      <Divisors>
        <Int>2</Int>
      </Divisors>
    </Divide>
  )
  .get(0)

// As we can see from the above tables, dividing an Int by an Int produces a
// Rational, in this case, 1/2.
//
// While we can only have one Dividend, Divide will take multiple Divisors and
// apply them sequentially.

CompNode
  .fromXml(
    <Divide>
      <Dividend>
        <Int>1</Int>
      </Dividend>
      <Divisors>
        <Int>2</Int>
        <Int>3</Int>
      </Divisors>
    </Divide>
  )
  .get(0)

// Let's explore two additional operations that are useful for taxes.

CompNode
  .fromXml(
    <StepwiseMultiply>
      <Multiplicand>
        <Dollar>9999.99</Dollar>
      </Multiplicand>
      <Rate>
        <Rational>50/1000</Rational>
      </Rate>
    </StepwiseMultiply>
  )
  .get(0)

// StepwiseMultiply takes two inputs, a Dollar amount and a rate, expressed as a
// Rational. We'll multiply the amount by the rate as follows: the numerator and
// the denominator of the rate are both whole dollars. We'll divide the amount
// by the denominator, dropping any remainder, and then multiply by the
// numerator. So $1,000 fits into $9,999.99 nine times, and nine times $50 is
// $450. Sometimes tax law will prescribe this less precise form of
// multiplication, for example in the phase-outs to the Child Tax Credit.

CompNode
  .fromXml(
    <Round>
      <Dollar>2.50</Dollar>
    </Round>
  )
  .get(0)

// Round, as you would expect, rounds a Dollar amount to the nearest whole
// number of dollars. 50 cents is always rounded up, per IRS guidance.
//
// Let's put it all together by implementing the TY2021 tax tables for a Married
// Filing Jointly couple or Qualifying Widow(er).

val dictionary = FactDictionary.fromXml(
  <Dictionary>
    <Fact path="/taxableIncome">
      <Writable><Dollar /></Writable>
    </Fact>

    <Fact path="/tax">
      <Derived>
        <Round>
          <Switch>
              // Not over $19,900:
              // 10% of the taxable income
              <Case>
                <When>
                  <LessThanOrEqual>
                    <Left><Dependency path="../taxableIncome" /></Left>
                    <Right><Dollar>19900</Dollar></Right>
                  </LessThanOrEqual>
                </When>
                <Then>
                  <Multiply>
                    <Rational>10/100</Rational>
                    <Dependency path="../taxableIncome" />
                  </Multiply>
                </Then>
              </Case>

              // Over $19,900 but not over $81,050:
              // $1,990 plus 12% of the excess over $19,900
              <Case>
                <When>
                  <LessThanOrEqual>
                    <Left><Dependency path="../taxableIncome" /></Left>
                    <Right><Dollar>81050</Dollar></Right>
                  </LessThanOrEqual>
                </When>
                <Then>
                  <Add>
                    <Dollar>1990</Dollar>
                    <Multiply>
                      <Rational>12/100</Rational>
                      <Subtract>
                        <Minuend>
                          <Dependency path="../taxableIncome" />
                        </Minuend>
                        <Subtrahends>
                          <Dollar>19900</Dollar>
                        </Subtrahends>
                      </Subtract>
                    </Multiply>
                  </Add>
                </Then>
              </Case>

              // Over $81,050 but not over $172,750:
              // $9,328 plus 22% of the excess over $81,050
              <Case>
                <When>
                  <LessThanOrEqual>
                    <Left><Dependency path="../taxableIncome" /></Left>
                    <Right><Dollar>172750</Dollar></Right>
                  </LessThanOrEqual>
                </When>
                <Then>
                  <Add>
                    <Dollar>9328</Dollar>
                    <Multiply>
                      <Rational>22/100</Rational>
                      <Subtract>
                        <Minuend>
                          <Dependency path="../taxableIncome" />
                        </Minuend>
                        <Subtrahends>
                          <Dollar>81050</Dollar>
                        </Subtrahends>
                      </Subtract>
                    </Multiply>
                  </Add>
                </Then>
              </Case>

              // Over $172,750 but not over $329,850:
              // $29,502 plus 24% of the excess over $172,750
              <Case>
                <When>
                  <LessThanOrEqual>
                    <Left><Dependency path="../taxableIncome" /></Left>
                    <Right><Dollar>329850</Dollar></Right>
                  </LessThanOrEqual>
                </When>
                <Then>
                  <Add>
                    <Dollar>29502</Dollar>
                    <Multiply>
                      <Rational>24/100</Rational>
                      <Subtract>
                        <Minuend>
                          <Dependency path="../taxableIncome" />
                        </Minuend>
                        <Subtrahends>
                          <Dollar>172750</Dollar>
                        </Subtrahends>
                      </Subtract>
                    </Multiply>
                  </Add>
                </Then>
              </Case>

              // Over $329,850 but not over $418,850:
              // $67,206 plus 32% of the excess over $329,850
              <Case>
                <When>
                  <LessThanOrEqual>
                    <Left><Dependency path="../taxableIncome" /></Left>
                    <Right><Dollar>418850</Dollar></Right>
                  </LessThanOrEqual>
                </When>
                <Then>
                  <Add>
                    <Dollar>67206</Dollar>
                    <Multiply>
                      <Rational>32/100</Rational>
                      <Subtract>
                        <Minuend>
                          <Dependency path="../taxableIncome" />
                        </Minuend>
                        <Subtrahends>
                          <Dollar>329850</Dollar>
                        </Subtrahends>
                      </Subtract>
                    </Multiply>
                  </Add>
                </Then>
              </Case>

              // Over $418,850 but not over $628,300:
              // $95,686 plus 35% of the excess over $418,850
              <Case>
                <When>
                  <LessThanOrEqual>
                    <Left><Dependency path="../taxableIncome" /></Left>
                    <Right><Dollar>628300</Dollar></Right>
                  </LessThanOrEqual>
                </When>
                <Then>
                  <Add>
                    <Dollar>95686</Dollar>
                    <Multiply>
                      <Rational>35/100</Rational>
                      <Subtract>
                        <Minuend>
                          <Dependency path="../taxableIncome" />
                        </Minuend>
                        <Subtrahends>
                          <Dollar>418850</Dollar>
                        </Subtrahends>
                      </Subtract>
                    </Multiply>
                  </Add>
                </Then>
              </Case>

              // Over $628,300:
              // $168,993.50 plus 37% of the excess over $628,300
              <Case>
                <When>
                  <True />
                </When>
                <Then>
                  <Add>
                    <Dollar>168993.50</Dollar>
                    <Multiply>
                      <Rational>37/100</Rational>
                      <Subtract>
                        <Minuend>
                          <Dependency path="../taxableIncome" />
                        </Minuend>
                        <Subtrahends>
                          <Dollar>628300</Dollar>
                        </Subtrahends>
                      </Subtract>
                    </Multiply>
                  </Add>
                </Then>
              </Case>
          </Switch>
        </Round>
      </Derived>
    </Fact>
  </Dictionary>
)

val graph = Graph(
  dictionary,
  InMemoryPersister(
    "/taxableIncome" -> Dollar("75000.00")
  )
)

graph.get("/tax")

// Note that when the arguments to an operation serve different roles, the
// operations require us to explicitly label them. So while Add and Multiply can
// take arguments in any order, Subtract and Divide use Minuend/Subtrahends and
// Dividend/Divisors to avoid ambiguity. Similarly, comparison operations like
// LessThanOrEqual explicitly specify Left and Right.
//
// As a bonus, we have introduced the Switch statement, which selects the first
// Case where the When condition returns true. All of the Whens must be
// booleans, while the Thens can be of any type, as long as it is the same
// across all Cases.
//
// In the next chapter, we'll look at the powerful concept of Collections, which
// is the final piece we'll need to enable the Fact Graph to model an entire
// tax return.
