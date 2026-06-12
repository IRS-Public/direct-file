import { FactGraph } from '@irs/js-factgraph-scala';
import { Condition, RawCondition } from '../flow/Condition.js';
import { ConfigProps, FlowComponentName, FlowNodeType } from '../flow/ContentDeclarations.js';
import { ComponentProps } from 'react';

export const conditionsPass = (props: ConfigProps<ComponentProps<FlowNodeType<FlowComponentName>>>, fg: FactGraph, collectionId: string | null) => {
  if (props && props.condition) {
    return new Condition(props.condition).evaluate(fg, collectionId);
    // eslint-disable-next-line eqeqeq
  } else if (props.conditions != undefined) {
    return props.conditions.every((c: RawCondition) => {
      const result = new Condition(c).evaluate(fg, collectionId);
      return result;
    });
  } else {
    return true;
  }
};
