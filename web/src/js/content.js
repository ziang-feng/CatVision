function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        (rect.top+rect.height) >= 0 &&
        (rect.left+rect.width) >= 0 &&
        (rect.bottom-rect.height) <= (window.innerHeight || document.documentElement.clientHeight) &&
        (rect.right-rect.width) <= (window.innerWidth || document.documentElement.clientWidth)

    );
}

function filterElement(e){
    if (!e.src) return false;
    if (!isInViewport(e)) return false;
    if (e.offsetWidth<90 || e.offsetHeight<90 ) return false;
    return true;
}

function messageHandler(request, sender, r) {
    if (request.msg == 'fetch'){
        console.log("Finding 🐈 in view...");
        let imgs = Array.from(document.getElementsByTagName('img'));
        let validImgs = imgs.filter(filterElement);
        console.log(`${validImgs.length} valid images found for query ${request.qid}. Sending to extension...`);
        let srcs = [];
        for (let i of validImgs) srcs.push(i.src);
        chrome.runtime.sendMessage({links:srcs,qid:request.qid},null)
    }
}


chrome.runtime.onMessage.addListener(messageHandler);
console.log("🐈 meow");