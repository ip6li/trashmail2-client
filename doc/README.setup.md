Requirements
============

 * MongoDB backend.
 * LMTP Trashmail Connector, see https://github.com/ip6li/lmtp-server
 * SMTP server configured for LMTP backend, Postfix is strongly recommended
 * NodeJS 10 or newer - older may work, but your mileage may vary
 * Nginx (or other web server) as reverse proxy for NodeJS server is strongly recommended
 * A domain for your disposable e-mail service, search for free domains... They also offering a free DNS service 

Install
=======

* git clone somewhere in filesystem as any user with exception of root.
Running as root **will** fuck up your server!

* npm install
* customize ~/trashmail.json and ~/views/index.&lt;lang&gt;.pug

Application Notes
=================

Take a glance on out test environment at https://github.com/ip6li/trashmail-tester
This is a fully working Trashmail solution for automatic tests.

For production you need to do following actions:

* Set up a Postfix server
* Set up a Nginx or Apache server as Reverse Proxy
* Remove Selenium-Hub and Selenium Firefox from Docker configuration

trashmail.json
--------------

This file must be located in exactly one of following locations:

* /etc/trashmail.json
* /usr/local/etc/trashmail.json
* ~/trashmail.json
* &lt;where this application is running&gt;/trashmail.json

See project wiki in Github for description

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
CONFIGPATH Custom path where to find config files
