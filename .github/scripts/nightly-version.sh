#!/bin/bash
version=$(echo "$(npm pkg get version)" | tr -d '"')
date=$(date +%Y%m%d)

# Determine a new version number by using the current date as a patch number
# (the following assumes that only major.minor.patch version numbers are used).
nightly="${version%.*}.$date"
npm version $nightly --no-git-tag-version

# Store new version number as environment variable.
nightly=$(echo "$(npm pkg get version)" | tr -d '"')
echo "version=$nightly" >> "$GITHUB_ENV"
