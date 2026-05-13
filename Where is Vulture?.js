// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: user-secret;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: user-secret;

const url = "https://whereisvulture.com/";
const fm = FileManager.iCloud();
const folderName = "Where is Vulture Assets";
const folderPath = fm.joinPath(fm.documentsDirectory(), folderName);
if (!fm.fileExists(folderPath)) fm.createDirectory(folderPath);

const cachePath = fm.joinPath(folderPath, "vulture_cache.json");
const imgPath = fm.joinPath(folderPath, "GZW-vulture.jpg");

// 1. COP REGISTRY
const copData = {
  "Crusader": "137:151", "Westmore": "168:161", "Nomad": "165:138",
  "Bronco": "152:110", "Harrison": "191:144", "Stalwart": "138:162",
  "Titan": "177:129", "Winchester": "159:147"
};

// 2. RESET LOGIC (Monday 5AM PT / 12:00 UTC)
let now = new Date();
let lastReset = new Date();
lastReset.setUTCHours(12, 0, 0, 0); 
let day = lastReset.getUTCDay();
let diffToMonday = (day === 0 ? 6 : day - 1); 
lastReset.setUTCDate(lastReset.getUTCDate() - diffToMonday);
if (now < lastReset) lastReset.setUTCDate(lastReset.getUTCDate() - 7);

let nextReset = new Date(lastReset.getTime());
nextReset.setUTCDate(nextReset.getUTCDate() + 7);
let timerDiff = nextReset - now;
let days = Math.floor(timerDiff / (1000 * 60 * 60 * 24));
let hours = Math.floor((timerDiff / (1000 * 60 * 60)) % 24);
let totalHoursLeft = timerDiff / (1000 * 60 * 60);

// 3. CACHE VALIDATION
let shouldScrape = true;
let cachedData = null;

if (fm.fileExists(cachePath)) {
  try {
    cachedData = JSON.parse(fm.readString(cachePath));
    if (new Date(cachedData.timestamp) > lastReset) {
      shouldScrape = false;
    }
  } catch (e) { shouldScrape = true; }
}

// 4. DATA ACQUISITION WITH SKEPTICISM
let renderedText = "";
if (shouldScrape) {
  const req = new Request(url);
  req.headers = { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1" };
  try {
    let html = await req.loadString();
    const wv = new WebView();
    await wv.loadHTML(html, url);
    const js = `
      var attempts = 0;
      function check() {
        var items = document.querySelectorAll('li');
        if (items.length > 0) {
          completion(Array.from(items).map(li => li.innerText).join('|'));
        } else if (attempts >= 100) { completion("TIMEOUT"); }
        else { attempts++; setTimeout(check, 200); }
      }
      check();
    `;
    renderedText = await wv.evaluateJavaScript(js, true);

    // VALIDATION: Does the text contain any known COPs?
    const hasValidCop = Object.keys(copData).some(name => renderedText.includes(name));
    // VALIDATION: Is it different from what we already have?
    const isNewData = cachedData ? (renderedText !== cachedData.payload) : true;

    if (renderedText !== "TIMEOUT" && hasValidCop && isNewData) {
      fm.writeString(cachePath, JSON.stringify({
        timestamp: now.getTime(),
        payload: renderedText
      }));
    } else if (!hasValidCop && renderedText !== "TIMEOUT") {
      // If scrape worked but found no known names, use cache but keep trying next time
      renderedText = cachedData ? cachedData.payload : "UNKNOWN";
    }
  } catch (e) {
    renderedText = cachedData ? cachedData.payload : "ERROR";
  }
} else {
  renderedText = cachedData.payload;
}

// 5. MAPPING & UI
let foundCamps = [];
if (renderedText && renderedText !== "TIMEOUT" && renderedText !== "ERROR" && renderedText !== "UNKNOWN") {
  const pageItems = renderedText.split('|');
  for (const item of pageItems) {
    for (const [name, coord] of Object.entries(copData)) {
      if (item.includes(name)) {
        foundCamps.push({ name: name.toUpperCase(), coord: "(" + coord + ")" });
      }
    }
  }
}

// UI Construction
const dayInMs = 24 * 60 * 60 * 1000;
let showBar = timerDiff <= dayInMs;
let barProgress = showBar ? (timerDiff / dayInMs) : 0;
let barColor = new Color("#8e8e93"); 
if (totalHoursLeft <= 4) barColor = new Color("#ff3b30"); 
else if (totalHoursLeft <= 12) barColor = new Color("#af52de"); 
else if (totalHoursLeft <= 20) barColor = new Color("#4cd964"); 

let w = new ListWidget();
w.backgroundColor = new Color("#000000");
w.setPadding(0, 0, 0, 0);

let cardStack = w.addStack();
cardStack.cornerRadius = 14;
cardStack.setPadding(34, 22, 12, 22); 
cardStack.layoutVertically();

if (fm.fileExists(imgPath)) cardStack.backgroundImage = fm.readImage(imgPath);
else cardStack.backgroundColor = new Color("#1c1c1e");

let contentRow = cardStack.addStack();
contentRow.layoutHorizontally();

let leftStack = contentRow.addStack();
leftStack.layoutVertically();
let title = leftStack.addText("VULTURE INTEL");
title.font = Font.boldSystemFont(11);
title.textColor = new Color("#FFD700"); 
leftStack.addSpacer(10);

let unique = Array.from(new Set(foundCamps.map(a => JSON.stringify(a)))).map(a => JSON.parse(a));
if (unique.length === 0) {
  let statusMsg = (renderedText === "UNKNOWN") ? "AWAITING UPDATE" : "SCANNING...";
  let empty = leftStack.addText(statusMsg);
  empty.font = Font.blackSystemFont(14);
  empty.textColor = Color.gray();
} else {
  unique.forEach(camp => {
    let row = leftStack.addStack();
    row.layoutHorizontally();
    let n = row.addText(camp.name);
    n.font = Font.blackSystemFont(14);
    n.textColor = Color.white();
    row.addSpacer(4);
    let coordStack = row.addStack();
    coordStack.layoutVertically();
    coordStack.addSpacer(3.5); 
    let c = coordStack.addText(camp.coord);
    c.font = Font.lightSystemFont(10);
    c.textColor = new Color("#8e8e93");
    leftStack.addSpacer(2);
  });
}

contentRow.addSpacer();
let rightStack = contentRow.addStack();
rightStack.layoutVertically();
let resetRow = rightStack.addStack();
resetRow.addSpacer(); 
let timeLabel = resetRow.addText("NEXT RESET");
timeLabel.font = Font.boldSystemFont(10);
timeLabel.textColor = new Color("#FFD700");

let timerRow = rightStack.addStack();
timerRow.layoutHorizontally();
timerRow.addSpacer(); 
let timerNudge = timerRow.addStack();
timerNudge.layoutVertically();
timerNudge.addSpacer(15); 
let timerText = timerNudge.addText(days + "D " + hours + "H");
timerText.font = Font.mediumMonospacedSystemFont(20);
timerText.textColor = Color.white();

cardStack.addSpacer();
if (showBar) {
  let barContainer = cardStack.addStack();
  barContainer.layoutHorizontally();
  barContainer.addSpacer(); 
  let barTrack = barContainer.addStack();
  barTrack.size = new Size(285, 4);
  barTrack.cornerRadius = 2;
  barTrack.backgroundColor = new Color("#3a3a3c", 0.3);
  let barFill = barTrack.addStack();
  barFill.size = new Size(285 * barProgress, 4); 
  barFill.backgroundColor = barColor;
  barContainer.addSpacer(); 
} else { cardStack.addSpacer(4); }

if (!config.runsInWidget) await w.presentMedium();
Script.setWidget(w);
Script.complete();
