//jshint node: true
//jshint esversion: 6

(function () {
    "use strict";

    const username = "joe.test";
    const domain = "example.com";
    const fqname = username + "@" + domain;

    const {Builder, By, Key, until, Select, ExpectedCondition} = require('selenium-webdriver');

    class Testmail {

        static getMsg() {
            return "Received: by mail.example.com (Postfix, from userid 0)\n\tid C7F588012AF; Sat, 12 Jan 2019 12:24:35 +0000 (UTC)\nDate: Sat, 12 Jan 2019 12:24:35 +0000\nTo: joe.test@example.com\nSubject: Test 1\nUser-Agent: s-nail v14.9.6\nMessage-Id: <20190112122435.C7F588012AF@mail.example.com>\nFrom: root <root@mail.example.com>\n\nHello world 1";
        }

        static sendMail() {
            const SMTPClient = require("smtp-client").SMTPClient;

            let s = new SMTPClient({
                host: 'localhost',
                port: 10025
            });

            return (async function () {
                await s.connect();
                await s.greet({hostname: 'mx.domain.com'}); // runs EHLO command or HELO as a fallback
                //await s.authPlain({username: 'john', password: 'secret'}); // authenticates a user
                await s.mail({from: 'from@sender.com'}); // runs MAIL FROM command
                await s.rcpt({to: fqname}); // runs RCPT TO command (run this multiple times to add more recii)
                await s.data(Testmail.getMsg()); // runs DATA command and streams email source
                await s.quit(); // runs QUIT command
            })();
        }
    }


    class Steps {

        static findForm(driver) {
            const main = driver.findElement(By.id("main"));
            return main.findElement(By.xpath("//*[@id=\"name\"]"));
        }

        static waitForReady(driver) {
            const form = Steps.findForm(driver);
            return driver.wait(
                until.elementIsVisible(form.findElement(By.xpath("//*[@id=\"submit\"]"))), 5000);
        }

        static user_click(driver) {
            return driver.findElement(By.xpath("//*[@id=\"submit\"]"))
                .click()
                .then(() => {
                    return Promise.resolve();
                })
                .catch((err) => {
                    console.log("click failed");
                    return Promise.reject(err);
                });
        }

        static user_input(driver, input) {
            return driver.findElement(By.xpath("//*[@id=\"name\"]"))
                .sendKeys(input)
                .then(()=>{
                    return Promise.resolve();
                })
                .catch((err) => {
                    console.log("sendKeys failed");
                    Promise.reject(err);
                });
        }

        static domain_select(driver) {
            return driver.findElement(
                By.xpath('//*[@id="domain"]/option[2]')
            );
        }

        static doTest() {
            (async function example() {
                let driver = await new Builder().forBrowser('firefox').build();
                try {
                    await driver.get('http://localhost:3000');

                    await Steps.waitForReady(driver);

                    await driver.wait(Steps.user_input(driver, username), 5000);

                    await driver.wait(Steps.domain_select(driver).click(), 5000);

                    //await driver.wait(until.elementLocated(By.xpath("//*[@id=\"xxxxxx\"]")), 15000);

                    await driver.wait(Steps.user_click(driver), 5000);

                    await driver.wait(until.elementLocated(By.xpath("//*[@id=\"to\"]")), 15000);

                    await driver.wait(
                        function () {
                            const found = driver.findElement(By.xpath("//*[@id=\"to\"]"));
                            return found.getText().then((text)=>{
                                return Promise.resolve(text);
                            });
                        },
                        5000
                    ).then((data) => {
                        console.log("Test succeeded with result: %o", data);
                        return Promise.resolve(data);
                    }).catch((err) => {
                        console.log("%o", err.message);
                    });
                } finally {
                    await driver.quit();
                }
            })();
        }

    }


    Testmail.sendMail().then(() => {
        console.log("Testmail sent");
    }).then(() => {
        return Steps.doTest();
    }).catch((err) => {
        console.error("Mail not sent: %o", err);
    });

}());
