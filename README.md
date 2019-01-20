Trashmail
=========

[![Build Status](https://travis-ci.org/ip6li/trashmail-tester.svg?branch=master)](https://travis-ci.org/ip6li/trashmail-tester)

Provides a web gui for a disposable mail system. It is written in JavaScript/NodeJS
and uses Express/PUG for templating.

This project replaces old Trashmail project, which suffered on scalability issues.

IMPORTANT
---------

File trashmail.json **MUST** contain line
"configRuntime": "trashmail.runtime.json",
for reference to runtime config. Please read Github wiki for further
information.

Features
--------

* Direct access to specific mail address by GET request
* URL encoded as QR code available
* Responsive design
* PUG template (formerly Jade)
* Supports mail attachments (configurable)
* QRcode for mobile devices
* If mail server supports DKIM it show DKIM status to user
* International support.

Status
------

Beta : Works in a single production environment.

Requirements
============

 * MongoDB backend.
 * LMTP Trashmail Connector, see ip6li/lmtp-server
 * SMTP server configured for LMTP backend, Postfix is strongly recommended
 * NodeJS 10 or newer - older may work, but your mileage may vary
 * Nginx (or other web server) as reverse proxy for NodeJS server is strongly recommended

Optional
--------

If you are using NodeJS without full libicu support you may consider to install
full-icu. *full-icu not found* warning will tell you, what to to. If you are
using nodejs from your Linux distribution you probably get a version with
full libicu support, so you do not have to care about this. If warning does not
appear do not install full-icu. 
 
Postfix
=======

At least you need an relay_domains file to tell postfix to forward messages
to LMTP Trashmail backend.

    <your domain>	lmtp:[172.16.238.12]:10025


    
Install
=======

* git clone somewhere in filesystem as any user with exception of root.
Running as root **will** fuck up your server!

* npm install
* customize ~/trashmail.json and ~/views/index.&lt;lang&gt;.pug

trashmail.json
--------------

This file must be located in exactly one of following locations:

* /etc/trashmail.json
* /usr/local/etc/trashmail.json
* ~/trashmail.json
* &lt;where this application is running&gt;/trashmail.json

See project wiki in Github for description

systemd
-------

Use systemd for start/stop server. It is recommended to use a Docker container based on
official Node image.

Docker
------

Example for docker-compose file:

```
version: '3.3'

networks:
  back:
    # use a custom driver, with no options
    driver: bridge
    ipam:
      driver: default
      config:
      -
        subnet: 172.16.239.0/24

services:
  mongodb:
    image: mongo
    networks:
       back:
        ipv4_address: 172.16.239.11
    logging:
      driver: json-file

  lmtp-server:
    depends_on:
      - mongodb
    build:
      context: ./lmtp-server
    networks:
       back:
        ipv4_address: 172.16.239.12
    logging:
      driver: json-file

  trashmail-client:
    depends_on:
      - mongodb
    build:
      context: ./trashmail-client
    networks:
      back:
        ipv4_address: 172.16.239.13
    logging:
      driver: json-file

```

These Docker containers starts MongoDB, LMTP Backend and Trashmail-Client.
Postfix should send mails to 172.16.239.12:10025 and Nginx reverse-proxy should connect to
172.16.239.13:3000.
 
Environment
===========

NODE_ENV [production|development]
LOGLEVEL see Winston documentation for available log levels

Other OS
========

* Recommended: Systemd based Linux distribution
* Should also work with FreeBSD, OpenBSD
