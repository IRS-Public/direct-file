# ADR: CSS Preprocessor
Written: 20Jun2023

## Background

CSS has some major problems. Namely, it:
1. lacks variable names and the ability to import variables from other libraries.
1. lacks nesting and other hierarchical structures that are common in components.
1. is global (cascading!), leading to naming conflicts, difficult dead code detection, and difficult maintainability in large code bases.
1. is constantly updated, and can have different implementations and minor differences between different browsers

To avoid these issues, while adding additional features, most of the web development community uses one or more forms of CSS Preprocessor, preprocessing a superset of CSS into the CSS that will eventually reach the users' browsers.

### Required Features
1. Must be able to implement and rely on the US Web Design System (USWDS)
    1. Specifically, we need to interact with and rely on https://github.com/trussworks/react-uswds and https://github.com/uswds/uswds. Both of these systems use SASS and export SASS variables.
1. Must be able to scope CSS, eliminating global classes
1. Must help, not hinder, building an accessible product.
1. Must build output that runs without issue on popular phones and computers
1. Must support mobile development and responsive design

### Evaluation Criteria
1. Interoperability with existing USWDS libraries
1. Reputation within the frontend web development community
1. Output to responsive, mobile-friendly, and accessible design.

## OSS Landscape
There are a few CSS popular preprocessors:
1. [SASS](https://sass-lang.com/), per their own marketing speak, defines themselves as "the most mature, stable, and powerful professional grade CSS extension language in the world." Sass has ~10m weekly downloads on NPM and is increasing in number of downloads.
1. [LESS](https://lesscss.org/) is the main competitor to SASS, and contains many of the same features.  Less has ~4m weekly downloads on NPM and is flat in number of downloads.
1. [PostCSS](https://postcss.org/) converts modern css into something most browsers can understand, placing polyfills in place. PostCSS is not a separate language -- it's a compile step like babel for greater compatibility. Stylelint and other tools are built on PostCSS
1. [CSS Modules](https://github.com/css-modules/css-modules) provide local scoping for CSS. Styles are defined in a normal css/less/sass file, then are imported into the React components that use those classes.
1. [Tailwind](https://tailwindcss.com/) is notable for being slightly different than other popular CSS frameworks, and is a css framework -- rather than a preprocessor -- that encourages stylistic, rather than semantic, classnames directly in markup. It's gaining popularity rapidly (4.7m downloads/wk, up from 3m downloads/wk a year ago). However, it would be hard to integrate with USWDS.
1. [Stylelint](https://stylelint.io/) is a CSS linter used to prevent bugs and increase maintainability of CSS


## Decision
We should run the following CSS Preprocessors:
1. Our CSS Language should be SASS, given its popularity and interoperability with USWDS. Most critically, we can import variable names from USWDS.
1. We should additionally use SASS Modules to scope our CSS to their components, avoiding global cascades.
1. We should use stylelint with its recommended config. We should also use the [a11y](https://www.npmjs.com/package/@ronilaukkarinen/stylelint-a11y) plugin experimentally to see if it helps us with accessibility (though noting that it seems not well supported and we should be willing to drop it).
1. Following our SASS compilation step, we should run postcss to get down to a supported list of browsers that we support via [browserlist](https://github.com/browserslist/browserslist#readme)

Unsurprisingly, when developing for these criteria (and with a sigh of relief that USWDS uses SASS), this is the same CSS stack used by [Create React App](https://create-react-app.dev/docs/adding-a-css-modules-stylesheet).
