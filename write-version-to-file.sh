echo "'use strict';" > $1 && echo "// This is a generated file. Do not edit." >> $1 && echo "export const version = \"$(git ls-files | grep -v "$1" | git hash-object --stdin)\";" >> $1
