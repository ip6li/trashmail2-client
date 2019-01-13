#!/bin/sh

JSHINT="./node_modules/jshint/bin/jshint"

for i in ../app/*.js; do
  echo "test js $i"
  $JSHINT $i
  if [ $? -ne 0 ]; then
    exit 1
  fi
done
