#!/usr/bin/env sh
echo $@
./bitcoin-cli.sh sendtoaddress $@
