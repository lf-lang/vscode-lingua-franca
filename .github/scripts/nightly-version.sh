#!/bin/bash

# Set a new version number based on the next minor version,
# combined with a patch version based on the current date.
npm version minor --no-git-tag-version > /dev/null 2>&1
version=$(echo "$(npm pkg get version)" | tr -d '"')
date=$(date +%Y%m%d)
# NOTE: the following assumes that only simple
# major.minor.patch version numbers are being used.
nightly="${version%.*}.$date"
echo $nightly
npm version $nightly --no-git-tag-version
