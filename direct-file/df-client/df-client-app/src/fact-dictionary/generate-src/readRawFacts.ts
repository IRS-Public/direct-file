import fs from 'fs';
import { XMLParser, XMLValidator, X2jOptions } from 'fast-xml-parser';
import { RawFact } from '../FactTypes.js';
import path from 'path';

export default function readRawFacts(): RawFact[] {
  const FACT_DICTIONARY_FOLDER = `../../backend/src/main/resources/tax/`;

  const XML_PARSER_OPTIONS: X2jOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: `@`,
    ignoreDeclaration: true,
    trimValues: true,
    parseAttributeValue: false,
  };

  // We assume all xml files in the tax folder are Fact Dictionary Fragments.
  const dictionaryFiles = fs.readdirSync(FACT_DICTIONARY_FOLDER).filter((f) => f.endsWith(`.xml`));

  const allRawFacts: RawFact[] = [];

  for (const dictionaryFile of dictionaryFiles) {
    // eslint-disable-next-line no-console
    console.log(`Reading file ${dictionaryFile}`);
    // nosemgrep: eslint.detect-non-literal-fs-filename
    const rawXmlString = fs.readFileSync(
      path.join(FACT_DICTIONARY_FOLDER, dictionaryFile),
      `utf-8`
    );

    const xmlValidationResult = XMLValidator.validate(rawXmlString, {
      allowBooleanAttributes: true,
    });

    // must use strict equality here, since this will return an object if untrue
    if (xmlValidationResult !== true) {
      // not client facing, so we'll allow console here
      // eslint-disable-next-line no-console
      console.error(`XML validation error`, xmlValidationResult);
      throw new Error(`XML validation error`);
    }

    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedDictionary = parser.parse(rawXmlString);

    if (!parsedDictionary.FactDictionaryModule) {
      throw new Error(`XML did not start with element "FactDictionaryModule`);
    }

    const rawFacts: RawFact[] = [].concat(parsedDictionary.FactDictionaryModule.Facts.Fact);
    rawFacts.forEach((fact: RawFact) => {
      fact.srcFile = dictionaryFile;
    });
    allRawFacts.push(...rawFacts);
  }
  return allRawFacts;
}
