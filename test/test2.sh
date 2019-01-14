#!/bin/sh

PATH=`pwd`/test-libs:$PATH
export PATH

TARGET1="selenium-test1.js"

node "${TARGET1}"
