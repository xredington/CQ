const { chromium } = require('playwright');const {spawn}=require('child_process');const path=require('path');
const mode=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file://'+path.join(__dirname,'index.html'),{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1000);
if(mode==='preview'){for(const t of [5,12,20,28,36,44,52,59,71,78,85,89.5]){await p.evaluate(t=>render(t),t);await p.screenshot({path:`prev/p${t}.jpg`,type:'jpeg',quality:70});}}
else{const fps=30,N=90*fps;const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','slow','-movflags','+faststart','out.mp4'],{stdio:['pipe','ignore','inherit']});
for(let i=0;i<N;i++){await p.evaluate(t=>render(t),i/fps);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%300===0)console.log('frame',i);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));}
await b.close();})();
