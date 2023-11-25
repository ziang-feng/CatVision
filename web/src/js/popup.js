import React from 'react';
import { createRoot } from 'react-dom/client';
import "../css/tw.css";
import "../css/all.min.css"; // fontawesome icons

class Popup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imgLinks: [],
            result: [],
            isReady: true,
            current: 0
        }
        this.handleResponse = this.handleResponse.bind(this);
        this.processImages = this.processImages.bind(this);
    }
    componentDidMount() {
        this.queryPage();
        chrome.runtime.onMessage.addListener(this.handleResponse);
    }
    async processImages(imgLinks, qid) {
        let backend = "http://localhost:5000";
        let rl = [];
        let flag=0;

        const chunkSize = 5;
        let c = 0;
        for (let i = 0; i < imgLinks.length; i += chunkSize) {
            const chunk = imgLinks.slice(i, i + chunkSize);
            // do whatever
            let options = {
                method: 'POST',
                body: JSON.stringify({ links: chunk, qid: qid }),
                mode: 'cors',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json'
                },
            };
            let r = await fetch(backend, options);
            let result = await r.json();
            if (result.qid == qid) {
                rl.push(...result.results)
                this.setState({ result: rl});
                console.log(`Received predictions for ${qid}, chuck ${c}`)
            }
            else{
                flag=1;
                break;
            }
            c+=1;
        }
        if (!flag){
            this.setState({ result: rl, isReady: true });
            console.log(`Received all predictions for ${qid}`)
        }
        else{
            this.setState({ imgLinks: [], result: [], isReady: true });
        }
        

    }
    queryPage() {
        let qid = Date.now();
        this.setState({ current: qid, isReady: false });
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { msg: "fetch", qid: qid });
        });
        console.log(`Querying page with qid ${qid} ...`);
    }
    handleResponse(response, sender, sendResponse) {
        console.log(`Received ${response.links.length} images for query ${response.qid}`);
        if (response.links.length > 0) {
            if (this.state.current == response.qid) {
                this.setState({ imgLinks: response.links,result: [] });
                this.processImages(response.links, response.qid);
            }
            else {
                this.setState({ imgLinks: [], result: [], isReady: true });
            }
        }
        else {
            this.setState({ imgLinks: [], result: [], isReady: true });
        }
    }
    render() {
        if (!this.state.isReady) {
            return (<div className='flex flex-col m-auto'>
                <img className="w-32 mx-auto mb-3" src="/img/icons8-cat.gif"></img>
                <p className="font-bold text-3xl mx-auto mb-2">Chasing 🐈 kitties ...</p>
                <p className="mx-auto px-3">This may take a while ... ({(this.state.result.length*100/this.state.imgLinks.length).toFixed(2)}%)</p>
            </div>)
        }
        else {
            let retryBtn = <button type="button" className='w-full h-12 bg-stone-800 text-white text-lg flex-shrink-0' onClick={() => { this.queryPage() }}>Try again 😺?</button>;
            
            let cats = [];
            let i = -1;
            let ii = -1;
            for (let r of this.state.result){
                i+=1;
                if (!r.length) continue
                for (let c of r){
                    ii+=1;
                    if (!c.flag) continue
                    let breedPred = [];
                    let j=0;
                    for (let b of c.breed.slice(0,3)){
                        let pct = parseFloat(b[1]);

                        breedPred.push(
                            <div className={'flex flex-row '+(j==0?" font-bold text-lg mb-1":"")} key={b[0]}>
                                <p className="ml-0 mr-3 w-14 my-auto">{(100*pct).toFixed(1)}%</p>
                                <div className="ml-0 mr-auto h-3 bg-zinc-200 rounded my-auto" style={{width:`${9*pct}rem`}}></div>
                                <p className="ml-auto mr-0 my-auto">{b[0]}</p>
                            </div>
                        );
                        j++;
                    }
                    let w,h,scale,Xs,Ys;
                    if (c.dim[0]>c.dim[1]){
                        w = "10rem";
                        h = `${(10*(c.dim[1]/c.dim[0]))}rem`;
                        scale = 10/c.dim[0];
                        Xs = c.dim[4]*scale;
                        Ys = c.dim[5]*scale;
                    }
                    else{
                        h = "10rem";
                        w = `${(10*(c.dim[0]/c.dim[1]))}rem`;
                        scale = 10/c.dim[1];
                        Xs = c.dim[4]*scale;
                        Ys = c.dim[5]*scale;
                    }
                    let age = c.age[0];
                    if (c.age[0]<0) age = 0;
                    if (c.age[0]>3) age = 3;
                    let ageRound = Math.round(age);

                    let clipImg = <div className='m-auto flex-shrink-0 flex-grow-0 relative overflow-hidden' style={{height:h,width:w}}>
                        <img className="absolute" src={this.state.imgLinks[i]} style={{width:`${Xs}rem`,maxWidth:`${Xs}rem`,height:`${Ys}rem`,top:`-${(c.dim[3]*scale)}rem`,left:`-${(c.dim[2]*scale)}rem`}}/>
                    </div>
                    cats.push(
                        <div className='flex flex-row mb-10' key={i*10+ii}>
                            <div className='w-40 h-40 bg-black rounded shadow-lg mr-3 flex-shrink-0 overflow-hidden flex'>
                                {clipImg}
                            </div>
                            <div className='flex flex-col flex-grow'>
                                <div className='flex flex-col'>
                                    {breedPred}
                                </div>
                                <div className='mt-auto'>
                                    <div className="flex flex-col">
                                        <div className="flex flex-row justify-between mb-2 text-neutral-400">
                                            <i className={"mt-auto fa-solid fa-cat text-sm"+(ageRound==0?" ":"")}></i>
                                            <i className={"mt-auto fa-solid fa-cat text-base"+(ageRound==1?" ":"")}></i>
                                            <i className={"mt-auto fa-solid fa-cat text-xl"+(ageRound==2?" ":"")}></i>
                                            <i className={"mt-auto fa-solid fa-cat text-2xl"+(ageRound==3?" ":"")}></i>
                                        </div>
                                        <div className='mx-2 relative h-2 bg-zinc-100 rounded mb-2'>
                                            <div className='absolute h-2 bg-zinc-600 rounded' style={{width:`${age*100/3}%`}}>
                                            </div>
                                        </div>
                                        <div className="flex flex-row justify-between">
                                            <p className={(ageRound==0?" ":"")}>Baby</p>
                                            <p className={(ageRound==1?" ":"")}>Young</p>
                                            <p className={(ageRound==2?" ":"")}>Adult</p>
                                            <p className={(ageRound==3?" ":"")}>Senior</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            }

            if (cats.length==0) {
                return (<div className='flex flex-col flex-grow'>
                    <div className='mx-auto mb-3 text-6xl flex flex-row mt-auto'>
                        <i className="fa-solid fa-cat text-6xl mr-1"></i><i className="fa-solid fa-question text-4xl"></i>
                    </div>
                    <p className="font-bold text-3xl mx-auto mb-2">No cats in current view...</p>
                    <p className="mx-auto px-10 mb-auto">Try to move around a bit? (Have you checked under the couch?)</p>
                    {retryBtn}
                </div>)
            }
            else {
                return (
                    <div className='flex flex-col w-full h-full overflow-auto flex-grow'>
                        <p className="text-4xl font-bold text-center py-3 bg-neutral-200 shadow-lg">{`Found ${cats.length} 😺 cats!`}</p>
                        <div className='flex flex-col w-full flex-grow overflow-auto px-3'>
                            <div className='mt-5'/>
                            {cats}
                        </div>
                        {retryBtn}
                    </div>
                )
            }

        }
    }
}

const root = createRoot(document.getElementById('app'));
root.render(<Popup />);