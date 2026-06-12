# Direct File
[Direct File](https://directfile.irs.gov) is a service from the United States Government that provides taxpayers the option to electronically file their federal tax return for free, directly with the Internal Revenue Service (IRS). Direct File is an interview-based service that is intended to work as well on a mobile phone as it does on a laptop, tablet, or desktop computer. It is available in English and Spanish and is designed to be accessible to taxpayers who have a variety of attitudes, aptitudes, abilities, and access needs.

Direct File interprets the United States' [Internal Revenue Code (26 USC)](https://www.irs.gov/privacy-disclosure/tax-code-regulations-and-official-guidance) as plain language questions, the answers to which should be known to taxpayers without need of external instructions or publications. Taxpayers' answers are then translated into standard tax forms and transmitted to the IRS's [Modernized e-File (MeF)](https://www.irs.gov/e-file-providers/modernized-e-file-program-information) API, which is available for authorized public use. These questions and logic, developed in close collaboration with the IRS [Office of Chief Counsel](https://www.irs.gov/about-irs/office-of-chief-counsel-at-a-glance), as well as the associated test cases and scenarios, may be useful for others working on products that need to accurately interpret United States tax law as of Tax Year 2024.

Direct File also incorporates the Fact Graph, a declarative, XML-based knowledge graph data structure that is designed to reason about incomplete information, such as a partially completed tax return. The Fact Graph is written in the Scala programming language; it runs on the JVM on the backend and is transpiled via [Scala.js](https://www.scala-js.org) to run on the client as well. Direct File's Fact Graph is not domain-specific, and it may be useful to revenue agencies and as a reference for business rules engine implementations.

Although Direct File only files federal tax returns, United States taxpayers also have state and local filing obligations. Direct File facilitates the completion of these obligations by enabling taxpayers to optionally import their federal return data into a third-party tool that can file state and/or local taxes, without needing to reenter information. This transaction is enabled via a State API, which transfers both standard MeF XML as well as an enriched JSON format that includes additional data elements that were identified as being useful to state revenue agencies to streamline the state tax experience.

Direct File was developed by an in-house team of technologists at the IRS. The blended, cross-agency team included support from [USDS](https://www.usds.gov) and [GSA](https://www.gsa.gov/), as well as vendor teams [TrussWorks](https://truss.works), [Coforma](https://coforma.io), and [ATI](https://atisolutions.us/).

For a more details on the program and its history see https://www.irs.gov/pub/irs-pdf/p5969.pdf and https://www.irs.gov/filing/irs-direct-file-for-free

**This repository has been archived and is no longer maintained.** The code is provided for historical reference and may contain unpatched or unknown vulnerabilities. It should **not** be used in production systems.

## Where do I start?
See [ONBOARDING.md](/ONBOARDING.md) if you want to jump into running Direct File locally

## Exempted Code
Not all source code, documentation and metadata used in the development of Direct File is included in this repository. Specifically, any code or data that is considered Personally Identifiable Information (PII), Federal Tax Information (FTI),
Sensitive But Unclassified (SBU), or source code developed for National Security Systems (NSS), as defined in 40 U.S.C. § 11103, is exempt. Due to these restrictions, certain pieces of functionality have been removed or rewritten.

# Authorities
Legal foundations for work include:
* Source code Harmonization And Reuse in Information Technology Act" of 2024, Public Law 118 - 187
* OMB Memorandum M-16-21, “Federal Source Code Policy: Achieving Efficiency,
Transparency, and Innovation through Reusable and Open Source Software,” August 8,
2016
* Federal Acquisition Regulation (FAR) Part 27 – Patents, Data, and Copyrights
* Digital Government Strategy: “Digital Government: Building a 21st Century Platform to
Better Serve the American People,” May 23, 2012
* Federal Information Technology Acquisition Reform Act (FITARA), December 2014
(National Defense Authorization Act for Fiscal Year 2015, Title VIII, Subtitle D)
* E-Government Act of 2002, Public Law 107-347
* Clinger-Cohen Act of 1996, Public Law 104-106
{
  "name": "direct-file",
  "version": "1.0.0",
  "description": "Your project description",
  "main": "index.js",
  "scripts": {
    "build": "webpack",
    "dev": "webpack --mode development",
    "prod": "webpack --mode production"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0"
  }
  {
  "name": "direct-file",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "build": "webpack"
  },
  "dependencies": {},
  "devDependencies": {
    "webpack": "^5.0.0",
    "webpack-cli": "^4.0.0"
  }
}const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
