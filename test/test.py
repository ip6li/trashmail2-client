#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
import lxml.etree
import os
import io
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib


os.environ['PATH'] = "./test-libs"

#
# Make sure that your chromedriver is in your PATH, and use the following line...
#
# driver = webdriver.Chrome()
driver = webdriver.Firefox()
#
# ... or, you can put the path inside the call like this:
# driver = webdriver.Chrome("/path/to/chromedriver")
#

parser = lxml.etree.HTMLParser()

driver.implicitly_wait(15)

driver.get("http://localhost:3000")

screen_count = 0


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


def load_mails():
    submit_button = None
    try:
        submit_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id=\"submit\"]"))
        )
    except Exception as e:
        print(e)
        driver.save_screenshot('screen.png')

    try:
        user_input = driver.find_element_by_xpath("//*[@id=\"name\"]")
        user_input.send_keys("joe.test")
    except Exception as e:
        print(e)
        driver.save_screenshot('screen.png')

    try:
        select = Select(driver.find_element_by_xpath('//*[@id="domain"]'))
        select.select_by_visible_text("example.com")
    except Exception as e:
        print(e)
        driver.save_screenshot('screen.png')

    try:
        submit_button.click()
    except Exception as e:
        print(e)
        driver.save_screenshot("screen.png")

    try:
        to = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id=\"to\"]"))
        )
        print(to.text)
    except Exception as e:
        print(e)
        driver.save_screenshot("screen.png")


def delete_mail():
    try:
        delete_icon = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(@id,'delete_')]"))
        )
        delete_icon.click()
    except Exception as e:
        print(e)
        driver.save_screenshot("screen.png")

    try:
        delete_icon = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(@id,'delete_')]"))
        )
        delete_icon.click()
    except Exception as e:
        print(e)
        driver.save_screenshot("screen.png")

    try:
        delete_confirm = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[@id='delete']"))
        )
        delete_confirm.click()
    except Exception as e:
        print("delete confirm")
        print(e)
        driver.save_screenshot("screen.png")


send_mail()

load_mails()
delete_mail()

time.sleep(10)

driver.quit()
