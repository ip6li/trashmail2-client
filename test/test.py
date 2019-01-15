#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import sys
import signal
import platform

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import Select
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
    from selenium.webdriver.firefox.firefox_binary import FirefoxBinary
except Exception as e:
    print("Selenium for Python3 missing, please consider to install:")
    print("dnf install python3-selenium")

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib


os.environ['PATH'] = "./test-libs"

#
# Make sure that your chromedriver is in your PATH, and use the following line...
#
# driver = webdriver.Chrome()
#
# ... or, you can put the path inside the call like this:
# driver = webdriver.Chrome("/path/to/chromedriver")
#
if os.path.isfile("/usr/lib64/firefox/firefox"):
    binary = FirefoxBinary("/usr/lib64/firefox/firefox")
elif os.path.isfile("/usr/lib/firefox/firefox"):
    binary = FirefoxBinary("/usr/lib/firefox/firefox")
elif platform.system() == "Darwin":
    binary = FirefoxBinary("/Applications/Firefox.app/Contents/MacOS/firefox-bin")
else:
    print("unsupported operating system")
    sys.exit(1)
driver = webdriver.Firefox(firefox_binary=binary)


driver.implicitly_wait(15)

driver.get("http://localhost:3000")

screen_count = 0


def sig_handler(signum, frame):
    sys.exit()


def send_mail():
    fromaddr = "source@example.org"
    to = "joe.test@example.com"
    msg = MIMEMultipart()
    msg['From'] = fromaddr
    msg['To'] = to
    msg['Date'] = time.asctime( time.localtime(time.time()))
    msg['Subject'] = "Python email"
    bodyPlain = "Python test mail"
    bodyHtml = "<html><body>Python html mail</body></html>"
    msg.attach(MIMEText(bodyPlain, 'plain'))
    msg.attach(MIMEText(bodyHtml, 'html'))

    server = smtplib.SMTP("127.0.0.1", 10025)
    server.ehlo()
    text = msg.as_string()

    server.sendmail(fromaddr, [to], text)

    server.close()


def do_screenshot(driver):
    global screen_count

    filename = "screenshot." + str(screen_count) + ".png"
    try:
        driver.save_screenshot(filename)
        screen_count = screen_count + 1
    except Exception as e:
        print("Error while saving screenshot: " + e)


def load_mails():
    submit_button = None
    try:
        submit_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id=\"submit\"]"))
        )
    except Exception as e:
        print(e)
    do_screenshot(driver)

    try:
        user_input = driver.find_element_by_xpath("//*[@id=\"name\"]")
        user_input.send_keys("joe.test")
    except Exception as e:
        print(e)
    do_screenshot(driver)

    try:
        select = Select(driver.find_element_by_xpath('//*[@id="domain"]'))
        select.select_by_visible_text("example.com")
    except Exception as e:
        print(e)
    do_screenshot(driver)

    try:
        submit_button.click()
    except Exception as e:
        print(e)
        do_screenshot(driver)

    try:
        to = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id=\"to\"]"))
        )
        print(to.text)
    except Exception as e:
        print(e)
    do_screenshot(driver)


def delete_mail():
    try:
        delete_icon = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(@id,'delete_')]"))
        )
        delete_icon.click()
    except Exception as e:
        print(e)
    do_screenshot(driver)


    try:
        delete_confirm = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[@id='delete']"))
        )
        delete_confirm.click()
    except Exception as e:
        print("delete confirm")
        print(e)
    do_screenshot(driver)


signal.signal(signal.SIGTERM, sig_handler)
signal.signal(signal.SIGINT, sig_handler)

send_mail()

load_mails()
delete_mail()

driver.quit()
