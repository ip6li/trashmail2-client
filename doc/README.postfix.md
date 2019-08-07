Postfix Set Up
==============

relay_domains
-------------

This file is central instance to route mails to lmtp-server.

```
example.com	lmtp:[172.16.238.12]:10025
```

virtual
-------

It is recommended to disallow sending mails to some reserved mail accounts.
It is best practise to route mails for those accounts to your preferred
admin mail address. If something bad is ongoing, people has a chance to
contact you.  

```
webmaster@example.com	hostmaster@example.net
postmaster@example.com	hostmaster@example.net
hostmaster@example.com	hostmaster@example.net
abuse@example.com		hostmaster@example.net
root			        hostmaster@example.net
```

Other Postfix Files
-------------------

Please set up your Postfix according to best practises, for reference, see Postfix
homepage http://www.postfix.org/ especially:

* Double check that your Postfix is not an open relay
* Check for backscatter - Postfix should deny receiving mail either with 4xx or 5xx, *do not* receive first and then bounce.
* Set up STARTTLS - Let's Encrypt offers server certificates for free, consider to donate to EFF
 
