#!/usr/bin/env python3
# -*- coding: utf-8 -*-


"""
This test expects a running trashmail2-client and lmtp-server. Both of them also
needs a MongoDB. Test was designed to run inside a Docker Compose environment
which provides all necessary services.

"""

import time

"""
You may customize following variables, they *must* match Your environment
"""

test_mail_name = "joe.test"
test_mail_domain = "example.com"
lmtp_server = "127.0.0.1"
lmtp_port = 10025

try:
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    import smtplib
except ImportError as e:
    print("email modules not found")
    raise e


def send_mail():
    global test_mail_name, test_mail_domain, lmtp_server, lmtp_port
    fromaddr = "source@example.org"
    to = test_mail_name + "@" + test_mail_domain
    msg = MIMEMultipart("alternative")
    msg['From'] = fromaddr
    msg['To'] = to
    msg['Date'] = time.asctime(time.localtime(time.time()))
    msg['Subject'] = "Python email"
    body_plain = "Python test mail"
    body_html = "<html><body>Python html mail</body></html>"
    msg.attach(MIMEText(body_plain, 'plain'))
    msg.attach(MIMEText(body_html, 'html'))

    server = smtplib.SMTP(lmtp_server, lmtp_port)
    server.ehlo()
    text = msg.as_string()

    server.sendmail(fromaddr, [to], text)

    server.close()


send_mail()
