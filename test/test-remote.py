#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time
import sys
import signal

test_mail_name = "joe.test"
test_mail_domain = "example.com"
url_under_test = "http://172.16.239.13:3000"
selenium_hub = 'http://127.0.0.1:4444/wd/hub'

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import Select
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
except Exception as e:
    print("Selenium for Python3 missing, please consider to install:")
    print("dnf install python3-selenium")

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib


#
# Make sure that your chromedriver is in your PATH, and use the following line...
#
# driver = webdriver.Chrome()
#
# ... or, you can put the path inside the call like this:
# driver = webdriver.Chrome("/path/to/chromedriver")
#
driver = webdriver.Remote(
   command_executor = selenium_hub,
   desired_capabilities = DesiredCapabilities.FIREFOX
   )


try:
  driver.get(url_under_test)
except Exception as e:
  print(e)
  driver.quit()

screen_count = 0


def sig_handler(signum, frame):
    try:
        driver.quit()
    except Exception:
        print("driver already dead, ignore this simply")
    sys.exit()


def do_screenshot(driver, mode="error"):
    global screen_count

    if mode == "ok":
        filename = "screen." + str(screen_count) + ".png"
    else:
        filename = "screen.err." + str(screen_count) + ".png"
    driver.save_screenshot(filename)
    screen_count = screen_count + 1


def send_mail():
    global test_mail_name, test_mail_domain
    fromaddr = "source@example.org"
    to = test_mail_name + "@" + test_mail_domain
    msg = MIMEMultipart("alternative")
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


def load_mails():
    global test_mail_name, test_mail_domain

    try:
        driver.set_window_size(1280, 1600)
    except Exception as e:
        print("Cannot resize window: " + str(e))

    submit_button = None
    try:
        submit_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id=\"submit\"]"))
        )
        do_screenshot(driver, "ok")
        print("found submit button")
    except Exception as e:
        print("element_to_be_clickable submit failed: " + str(e))
        do_screenshot(driver)

    try:
        user_input = driver.find_element_by_xpath("//*[@id=\"name\"]")
        user_input.click()
        user_input.send_keys(test_mail_name)
        print("Entered username")
    except Exception as e:
        print("enter name - find_element name failed: " + str(e))
        do_screenshot(driver)

    try:
        select = Select(driver.find_element_by_xpath('//*[@id="domain"]'))
        select.select_by_visible_text(test_mail_domain)
        print("Selected domain")
    except Exception as e:
        print("select domain - find_element domain failed: " + str(e))
        do_screenshot(driver)

    try:
        submit_button.click()
        print("Submit clicked, now wait for mails")
    except Exception as e:
        print("submit click failed")
        print(e)
        do_screenshot(driver)

    try:
        to = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id=\"to\"]"))
        )
        print("==========================================================")
        print(to.text)
        print("==========================================================")
        print("Mail found")
    except Exception as e:
        print("element_to_be_clickable to failed")
        print(e)
        do_screenshot(driver)

    try:
        driver.switch_to.frame(driver.find_elements(By.TAG_NAME, "iframe")[0])
        iframe = driver.find_elements(By.TAG_NAME, "html")
        print("==========================================================")
        for i in iframe:
            print(i.text)
        print("==========================================================")
        driver.switch_to.default_content()
    except Exception as e:
        print("switch to iframe failed")
        print(e)
        do_screenshot(driver)


def delete_mail():
    try:
        do_screenshot(driver, "ok")
        delete_icon = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(@id,'delete_')]"))
        )
        delete_icon.click()
        print("Delete clicked")
        do_screenshot(driver, "ok")
    except Exception as e:
        print("element_to_be_clickable delete_ failed")
        print(e)
        do_screenshot(driver)

    try:
        delete_confirm = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[@id='delete']"))
        )
        delete_confirm.click()
        time.sleep(3)
        do_screenshot(driver, "ok")
        print("Delete confirmed")
    except Exception as e:
        print("click delete failed: " + str(e))
        do_screenshot(driver)



signal.signal(signal.SIGTERM, sig_handler)
signal.signal(signal.SIGINT, sig_handler)

send_mail()

load_mails()
delete_mail()

driver.quit()

