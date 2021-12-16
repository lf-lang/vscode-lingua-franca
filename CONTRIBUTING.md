# Contributing
This repo provides the [Lingua Franca](https://www.lf-lang.org/) (LF) [Visual
Studio Code](https://code.visualstudio.com/) (VSCode) extension built around the
LF Language and Diagram Server (LDS).

This file contains information for building and using the extension in a
developer setup. If you just want to use the extension, then you can download it
from the VSCode marketplace. See
[README.md](https://github.com/lf-lang/vscode-lingua-franca/) for more info.

## Getting started
```
git clone git@github.com:lf-lang/vscode-lingua-franca.git \
&& cd vscode-lingua-franca \
&& npm install
```

## Running the tests
```
npm run test
```

## Adding tests
Tests are located in the `src` directory and are marked using the `.test.ts` extension. We use [Jest](https://jestjs.io/) as our testing framework.

## Submitting a Pull Request (PR)
Please keep your PRs manageable and easy to review.
 - Provide a clear title and description of the proposed changes;
 - Keep the changes limited to a particular feature, fix, or enhancement;
 - Mark the PR as "draft" until it is ready for review; 
 - Provide tests along with your code; and
 - Follow the [TypeScript style
   guide](https://google.github.io/styleguide/tsguide.html) to avoid trivial
   review feedback.
