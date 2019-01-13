#!/bin/sh

PATH=`pwd`/test-libs:$PATH
export PATH

TARGET1="selenium-test1.js"

if [ ! -f "${TARGET1}" ]; then

cat > "${TARGET1}" <<EOF
(function () {
    "use strict";

    const {Builder, By, Key, until, ExpectedCondition } = require('selenium-webdriver');

    
    class Steps {

        static waitForReady (driver) {
            return driver.wait(
                until.elementIsVisible(By.id("name"))
            ,5000);
        }
        
        
        static scrollToForm(driver) {
            return driver.findElement(
                By.name('email'));
        }
        
        static user_click (driver) {
            return driver.findElement(
                By.id('name')
            ).click().catch((err) => {
                console.log ("click failed");
                Promise.reject(err);
            });
        }
        
        static user_input (driver, input) {
            return driver.findElement(
                By.id('name')
            ).sendKeys(input).catch((err) => {
                console.log ("sendKeys failed");
                Promise.reject(err);
            });
        }
        
    }
    
    
    (async function example() {
        let driver = await new Builder().forBrowser('firefox').build();
        try {
            await driver.get('http://localhost:3000');

            await Steps.waitForReady(driver);
            
            await Steps.scrollToForm(driver);
            
            await Steps.user_click(driver);
            
            await Steps.user_input(driver, "webdriber" + Key.RETURN)
            
            await driver.wait(
                //until.titleIs('webdriver - Google Search'), 
                function() {
                    return driver.getTitle().then(function(title) {
                        //console.log("%o", title);
                        return title.toLocaleLowerCase().match(/.*webdriver.*/);
                    });
                },
                5000
            ).then((data)=> {
                console.log("%o", data);
                return Promise.resolve(data);
            }).catch((err) => {
                console.log ("%o", err.message);
            });
        } finally {
            await driver.quit();
        }
    })();

}());
EOF

fi

node "${TARGET1}"

