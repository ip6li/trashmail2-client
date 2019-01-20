#!/usr/bin/env python3
# -*- coding: utf-8 -*-


"""
This test expects a running trashmail2-client and lmtp-server. Both of them also
needs a MongoDB. Test was designed to run inside a Docker Compose environment
which provides all necessary services.

"""

import time
import sys
import signal
import unittest

"""
You may customize following variables, they *must* match Your environment
"""

test_mail_name = "joe.test"
test_mail_domain = "example.com"
url_under_test = "http://172.16.239.13:3000"
selenium_hub = 'http://127.0.0.1:4444/wd/hub'
lmtp_server = "127.0.0.1"
lmtp_port = 10025


try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as ec
    from selenium.webdriver.support.ui import Select
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
except ImportError as e:
    print("Selenium for Python3 missing, please consider to install")
    raise e

try:
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    import smtplib
except ImportError as e:
    print("email modules not found")
    raise e


class Test1(unittest.TestCase):

    __screen_count = 0
    __test_count = 0
    __driver = None

    def setUp(self):
        self.driver = webdriver.Remote(
           command_executor=selenium_hub,
           desired_capabilities=DesiredCapabilities.FIREFOX
           )

        signal.signal(signal.SIGTERM, self.sig_handler)
        signal.signal(signal.SIGINT, self.sig_handler)

        try:
            self.driver.get(url_under_test)
            print("Test set up successful")
        except Exception as err:
            print("Test set up failed")
            print(err)
            self.driver.quit()

        Test1.send_mail()

    def tearDown(self):
        try:
            self.driver.quit()
            print("Test tear down successful")
        except Exception as err:
            print("Test tear down failed")
            print(err)

    def sig_handler(self, signum, frame):
        try:
            self.driver.quit()
        except Exception as err:
            print("driver already dead, ignore this simply")
            print(err)

        print("Got signal")
        print(signum)
        print(frame)
        sys.exit()

    def do_screenshot(self, mode="error"):
        if mode == "ok":
            filename = "screen." + str(self.__screen_count) + ".png"
        else:
            filename = "screen.err." + str(self.__screen_count) + ".png"
        self.driver.save_screenshot(filename)
        self.__screen_count = self.__screen_count + 1

    def printTestCount(self, msg=""):
        if len(msg) != 0:
            print("Test " + str(self.__test_count) + ": " + msg)
        else:
            print("Test " + str(self.__test_count))
        self.__test_count = self.__test_count + 1

    @staticmethod
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

    def load_mails(self):
        global test_mail_name, test_mail_domain

        try:
            self.driver.set_window_size(1280, 1600)
            self.printTestCount("Set screen size")
        except Exception as err:
            print("Cannot resize window")
            print(err)
            raise err

        try:
            submit_button = WebDriverWait(self.driver, 10).until(
                ec.element_to_be_clickable((By.XPATH, "//*[@id='submit']"))
            )
            self.do_screenshot("ok")
            self.printTestCount("found submit button")
        except Exception as err:
            print("element_to_be_clickable submit failed")
            print(err)
            self.do_screenshot()
            raise err

        try:
            user_input = self.driver.find_element_by_xpath("//*[@id='name']")
            user_input.click()
            user_input.send_keys(test_mail_name)
            self.printTestCount("Entered username")
        except Exception as err:
            print("enter name - find_element name failed")
            print(err)
            self.do_screenshot()
            raise err

        try:
            select = Select(self.driver.find_element_by_xpath('//*[@id="domain"]'))
            select.select_by_visible_text(test_mail_domain)
            self.printTestCount("Selected domain")
        except Exception as err:
            print("select domain - find_element domain failed")
            print(err)
            self.do_screenshot()
            raise err

        try:
            submit_button.click()
            self.printTestCount("Submit clicked, now wait for mails")
        except Exception as err:
            print("submit click failed")
            print(err)
            self.do_screenshot()
            raise err

        try:
            to = WebDriverWait(self.driver, 10).until(
                ec.element_to_be_clickable((By.XPATH, "//*[@id='to']"))
            )
            reference = test_mail_name + "@" + test_mail_domain
            self.assertEqual("To:\n<" + reference + ">", to.text, "Mail found assertion")
            self.printTestCount("Mail found")
        except Exception as err:
            print("element_to_be_clickable to failed")
            print(err)
            self.do_screenshot()
            raise err

        try:
            self.driver.switch_to.frame(self.driver.find_elements(By.TAG_NAME, "iframe")[0])
            iframe = self.driver.find_elements(By.TAG_NAME, "html")
            for i in iframe:
                self.assertEqual("Python html mail", i.text, "Mail text assertion")
            self.driver.switch_to.default_content()
            self.printTestCount("Mail text accessible")
        except Exception as err:
            print("switch to iframe failed")
            print(err)
            self.do_screenshot()
            raise err

    def delete_mail(self):
        try:
            self.do_screenshot("ok")
            delete_icon = WebDriverWait(self.driver, 10).until(
                ec.element_to_be_clickable((By.XPATH, "//*[contains(@id,'delete_')]"))
            )
            delete_icon.click()
            self.printTestCount("Delete clicked")
            self.do_screenshot("ok")
        except Exception as err:
            print("element_to_be_clickable delete_ failed")
            print(err)
            self.do_screenshot()
            raise err

        try:
            delete_confirm = WebDriverWait(self.driver, 10).until(
                ec.element_to_be_clickable((By.XPATH, "//button[@id='delete']"))
            )
            delete_confirm.click()
            self.do_screenshot("ok")
            self.printTestCount("Delete confirmed")
        except Exception as err:
            self.assertTrue(False, "click delete failed")
            print("click delete failed")
            print(err)
            self.do_screenshot()
            raise err

    def test_trashmail(self):
        self.load_mails()
        self.delete_mail()


if __name__ == '__main__':
    unittest.main()
