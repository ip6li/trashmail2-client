Trashmail
=========

[![Build Status](https://travis-ci.com/ip6li/trashmail-tester.svg?branch=master)](https://travis-ci.com/ip6li/trashmail-tester)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

This tool is for building a trashmail service. It is suitable either for private
networks (for example your company) or public services to provide temporary
e-mail addresses to your users.

Public installation is at https://spamwc.de

Use Cases
---------

Many services want you to provide a e-mail address. After providing that, you may get a lot of spam,
they are calling that opt-out newsletters. Now this disposable e-mail tool helps you. If you registered
somewhere for somewhat and do not like their newsletter you will get desired information and you
can forget unsolicited newsletter.

How to support
==============

If you are interested to support this project please set up a pull request. You may get access
to our private Gitlab system then. Github is a mirror only due to security reasons, but it
contains a exact copy of that private repository. 

Documentation
=============

See /doc folder for further documentation.

Architecture
============

This solution consists on at least 3 + 1 core services:

* Trashmail2-Client (this tool) - this is a Web-GUI for retrieving e-mails
* MongoDB - this is the storage medium for received e-mail
* lmtp-server - for receiving e-mail. It is strongly recommended to set up a SMTP mailgateway in front of this server
* smtp server - we recommend to use a Postfix server to receive mails from Internet, doing some filtering, routing etc. and relay them to lmtp-server  

Provides a web gui for a disposable mail system. It is written in JavaScript/NodeJS
and uses Express/PUG for templating.

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

Production: Works in a single production environment.

Optional
--------

If you are using NodeJS without full libicu support you may consider to install
full-icu. *full-icu not found* warning will tell you, what to to. If you are
using nodejs from your Linux distribution you probably get a version with
full libicu support, so you do not have to care about this. If warning does not
appear do not install full-icu. 

Other OS
========

* Recommended: Systemd based Linux distribution
* Should also work with FreeBSD, OpenBSD
