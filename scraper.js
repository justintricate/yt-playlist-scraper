const puppeteer = require('puppeteer');
const {
    start
} = require('repl');

async function getElText(page, selector) {
    return await page.evaluate((selector) => {
        return document.querySelector(selector).innerText
    }, selector);
}

async function scrapePage(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);
    var elements;
    var goAgain = true;
    while (goAgain) {
        const divCount = await page.$$eval('paper-spinner', divs => divs.length);
        await page.evaluate(async() => {
            window.scrollTo(0, document.querySelector("#primary").scrollHeight)
        })
        goAgain = divCount != 0;
    }
    elements = await page.$$('a.ytd-playlist-video-renderer');
    var len = elements.length
    console.log(`Items in playlist: ${len}`);

    for (var i = 0; i < len; i++) {
        const elem = elements[i];
        const href = await page.evaluate(e => e.href, elem); //Chrome will return the absolute URL
        const newPage = await browser.newPage();
    
        //Following lines block media to speed up scrape
        await newPage.setRequestInterception(true);

        newPage.on('request', request => {
                const url = request.url().toLowerCase()
                const resourceType = request.resourceType()

                if (resourceType == 'media' ||
                    url.endsWith('.mp4') ||
                    url.endsWith('.avi') ||
                    url.endsWith('.flv') ||
                    url.endsWith('.mov') ||
                    url.endsWith('.wmv') ||
                    url.includes('videoplayback')) {
                    request.abort();
                } else
                    request.continue();
            })
            
        const start = Date.now();
        await newPage.goto(href);;
        try {
            await newPage.waitForSelector('.short-view-count.yt-view-count-renderer');
            const viewCount = await getElText(newPage, '.view-count.yt-view-count-renderer');
            const titleText = await getElText(newPage, '.title.ytd-video-primary-info-renderer');
            //const uploadDate = await getElText(newPage, 'ytd-video-primary-info-renderer');

            console.log('Title: ', titleText)
            console.log(viewCount)
            //console.log(uploadDate)
            // console.log('Loaded in', Date.now() - start, 'ms')
            await newPage.close();
        } catch (error) {
            console.log("UNSUCCESSFUL SCRAPE! Video may be private or deleted.")
        }
    }
    browser.close();
};

scrapePage(process.argv[2]);