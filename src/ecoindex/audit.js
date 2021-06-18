const puppeteer = require("puppeteer");

let quantiles_dom = [
    0,
    47,
    75,
    159,
    233,
    298,
    358,
    417,
    476,
    537,
    603,
    674,
    753,
    843,
    949,
    1076,
    1237,
    1459,
    1801,
    2479,
    594601,
  ];
  let quantiles_req = [
    0,
    2,
    15,
    25,
    34,
    42,
    49,
    56,
    63,
    70,
    78,
    86,
    95,
    105,
    117,
    130,
    147,
    170,
    205,
    281,
    3920,
  ];
  let quantiles_size = [
    0,
    1.37,
    144.7,
    319.53,
    479.46,
    631.97,
    783.38,
    937.91,
    1098.62,
    1265.47,
    1448.32,
    1648.27,
    1876.08,
    2142.06,
    2465.37,
    2866.31,
    3401.59,
    4155.73,
    5400.08,
    8037.54,
    223212.26,
  ];
  
  /**
  Calcul ecoIndex based on formula from web site www.ecoindex.fr
  **/
  function computeEcoIndex(dom, req, size) {
    const q_dom = computeQuantile(quantiles_dom, dom);
    const q_req = computeQuantile(quantiles_req, req);
    const q_size = computeQuantile(quantiles_size, size);
  
    return Math.round(100 - (5 * (3 * q_dom + 2 * q_req + q_size)) / 6);
  }
  
  function computeQuantile(quantiles, value) {
    for (let i = 1; i < quantiles.length; i++) {
      if (value < quantiles[i])
        return i + (value - quantiles[i - 1]) / (quantiles[i] - quantiles[i - 1]);
    }
    return quantiles.length;
  }
  
  function getEcoIndexGrade(ecoIndex) {
    if (ecoIndex > 75) return "A";
    if (ecoIndex > 65) return "B";
    if (ecoIndex > 50) return "C";
    if (ecoIndex > 35) return "D";
    if (ecoIndex > 20) return "E";
    if (ecoIndex > 5) return "F";
    return "G";
  }
  
  function computeGreenhouseGasesEmissionfromEcoIndex(ecoIndex) {
    return (2 + (2 * (50 - ecoIndex)) / 100).toFixed(2);
  }
  
  function computeWaterConsumptionfromEcoIndex(ecoIndex) {
    return (3 + (3 * (50 - ecoIndex)) / 100).toFixed(2);
  }
  
module.exports =  async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
  
    let numberOfRequests = 0;
    let sizeOfRequests = 0;
  
    const devToolsResponses = new Map();
    const devTools = await page.target().createCDPSession();
    await devTools.send("Network.enable");
  
    devTools.on("Network.responseReceived", (event) => {
      devToolsResponses.set(event.requestId, event.response);
    });
  
    devTools.on("Network.loadingFinished", (event) => {
      numberOfRequests++;
      sizeOfRequests += event.encodedDataLength;
    });
    await page.goto(url);
    const metrics = await page.evaluate(() => {
      return document.getElementsByTagName("*").length;
    });
    const ecoIndex = computeEcoIndex(
      metrics,
      numberOfRequests,
      Math.round(sizeOfRequests / 1000)
    );
  
    await browser.close();
    return {
      ecoIndex,
      grade: getEcoIndexGrade(ecoIndex),
      greenhouseGasesEmission: computeGreenhouseGasesEmissionfromEcoIndex(
        ecoIndex
      ),
      waterConsumption: computeWaterConsumptionfromEcoIndex(ecoIndex),
    };
  };