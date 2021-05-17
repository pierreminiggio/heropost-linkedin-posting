import loginToHeropost from '@pierreminiggio/heropost-login'
import puppeteer from 'puppeteer'
import setDefault from '@pierreminiggio/set-default-value-for-key-in-object'
import type from '@pierreminiggio/puppeteer-text-typer'

/**
 * 
 * @typedef {Object} LinkedinLink
 * @property {string} url
 * @property {string} title
 * @property {string} caption
 * 
 * @typedef {Object} HeropostLinkedinPostingConfig
 * @property {boolean} show default false
 * 
 * @param {string} login
 * @param {string} password
 * @param {string} accountOrPageId
 * @param {LinkedinLink} link
 * @param {HeropostLinkedinPostingConfig} config
 * 
 * @returns {Promise}
 */
export function postLink(login, password, accountOrPageId, link, config = {}) {

    return new Promise(async (resolve, reject) => {
        
        setDefault(config, 'show', false)

        let browser
        
        try {
            browser = await puppeteer.launch({
                headless: ! config.show,
                args: [
                    '--disable-notifications',
                    '--no-sandbox'
                ]
            })
        } catch(error) {
            reject(e)
            return
        }
        
        const page = await browser.newPage()

        try {
            await loginToHeropost(page, login, password)
            const linkedinPostPage = 'https://dashboard.heropost.io/linkedin_post'
            await page.goto(linkedinPostPage)

            const accountOrPageIdInListSelector = '[data-pid="' + accountOrPageId + '"]'

            try {
                await page.waitForSelector(accountOrPageIdInListSelector)
            } catch (error) {
                throw new Error('Heropost/Linkedin error : Channel ' + accountOrPageId + ' not set up on heropost account or Linkedin quota exceeded')
            }

            try {
                await page.evaluate(accountOrPageIdInListSelector => {
                    document.querySelector(accountOrPageIdInListSelector + ' input').click()
                }, accountOrPageIdInListSelector)
            } catch (error) {
                throw new Error('Scraping error : Checkbox for channel ' + accountOrPageId + ' is missing !')
            }

            await page.waitForTimeout(1000)

            const linkButtonSelector = 'input[name="post_type"][value="link"]'
            try {
                await page.waitForSelector(linkButtonSelector)
                await page.click(linkButtonSelector)
            } catch (error) {
                throw new Error('Scraping error : Link Button Selector is missing !')
            }

            const linkInputSelector = 'input[name="link"]'
            try {
                await page.waitForSelector(linkInputSelector)
            } catch (error) {
                throw new Error('Scraping error : Link input selector is missing !')
            }

            await page.evaluate((linkInputSelector, url) => {
                document.querySelector(linkInputSelector).value = url
            }, linkInputSelector, link.url)

            const titleInputSelector = '[name="advance[title]"]'
            try {
                await page.waitForSelector(titleInputSelector)
            } catch (error) {
                throw new Error('Scraping error : Title input selector is missing !')
            }

            await page.evaluate((titleInputSelector, title) => {
                document.querySelector(titleInputSelector).value = title
            }, titleInputSelector, link.title)
 
            const descriptionInputSelector = '.emojionearea-editor'
            try {
                await page.waitForSelector(descriptionInputSelector)
            } catch (error) {
                throw new Error('Scraping error : Description input selector is missing !')
            }

            await type(page, descriptionInputSelector, link.caption)

            const postButtonSelector = '.btn-post-now'
            try {
                await page.waitForSelector(postButtonSelector)
            } catch (error) {
                throw new Error('Scraping error : Post button selector is missing !')
            }

            await page.waitForTimeout(10000)

            await page.click(postButtonSelector)

            const uploadStatusMessage = await getToastMessage(page)

            if (uploadStatusMessage.includes('Content is a duplicate of')) {
                throw new Error('Linkedin error : Duplicate content error')
            }
            
            if (! uploadStatusMessage.includes('Content is being published')) {
                throw new Error('Heropost/Linkedin error : Unknow error while posting')
            }

            await page.goto(linkedinPostPage)

            const bellButtonSelector = 'a[data-original-title="Schedule history"]'

            try {
                await page.waitForSelector(bellButtonSelector)
            } catch (error) {
                throw new Error('Scraping error : Bell button selector is missing !')
            }

            await page.click(bellButtonSelector)

            const postedItemSelector = '.item.search-schedule'
            try {
                await page.waitForSelector(postedItemSelector)
            } catch (error) {
                throw new Error('Scraping error : Posted item selector is missing !')
            }

            const successStatusSelector = postedItemSelector + ' .status.text-success'
            try {
                await page.waitForSelector(successStatusSelector)
            } catch (error) {
                let errorMessage = null
                const errorStatusSelector = postedItemSelector + ' .status.text-danger'
                try {
                    await page.waitForSelector(errorStatusSelector)
                    const errorElement = await page.$(errorStatusSelector)
                    errorMessage = errorElement.innerText
                } catch (e) {
                    // whatever
                }

                if (errorMessage) {  
                    if (errorMessage.includes('Content is a duplicate of')) {
                        throw new Error('Linkedin error : Duplicate content error')
                    }

                    throw new Error('Heropost/Linkedin error : ' + errorMessage)
                }

                throw new Error('Heropost/Linkedin error : Linkedin API returned an error ?')
            }

            const postLinkSelector = successStatusSelector + ' a'
            try {
                await page.waitForSelector(postLinkSelector)
            } catch (error) {
                throw new Error('Heropost/Linkedin error : Post link not found ?')
            }

            const postLink = await page.evaluate(postLinkSelector => {
                return document.querySelector(postLinkSelector).href
            }, postLinkSelector)

            await browser.close()

            resolve(postLink)
        } catch (e) {
            await browser.close()
            reject(e)
        }
    })
}

/**
 * @param {puppeteer.Page} page
 * 
 * @returns {Promise<string>} 
 */
function getToastMessage(page) {
    return new Promise(async resolve => {
        const message = await page.evaluate(async () => {
            const message = await new Promise(resolve => {
                const toastInterval = setInterval(() => {
                    const toast = document.querySelector('.iziToast')
                    if (toast !== null && toast.innerText.trim()) {
                        resolve(toast.innerText)
                        clearInterval(toastInterval)
                    }
                }, 10)
            })

            return message
        })

        resolve(message)
    })
}
