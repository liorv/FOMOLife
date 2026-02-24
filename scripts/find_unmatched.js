const fs=require('fs');
const path='unit-tests/App.test.js';
const text=fs.readFileSync(path,'utf8');
const lines=text.split(/\r?\n/);
let bal=0;
let lastZeroLine=0;
for(let i=0;i<lines.length;i++){
  let line=lines[i];
  for(let ch of line){
    if(ch=='{') bal++;
    else if(ch=='}') bal--;
  }
  if(bal===0) lastZeroLine=i+1;
}
console.log('lastZeroLine', lastZeroLine, 'totalLines', lines.length, 'final bal', bal);
