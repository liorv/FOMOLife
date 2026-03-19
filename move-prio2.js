const fs = require('fs');
let code = fs.readFileSync('packages/ui/src/TaskList/TaskRow.tsx', 'utf8');

const markerSelectStart = '              {type === "tasks" ? (';
const markerSpanText = '              <span>{item.text}</span>';

let pStart = code.indexOf(markerSelectStart);
let pEnd = code.indexOf(markerSpanText);

if (pStart !== -1 && pEnd !== -1) {
    let block = code.substring(pStart, pEnd);
    // remove the block from current position
    code = code.substring(0, pStart) + code.substring(pEnd);
    
    // now we need to insert the block AFTER <span>{item.text}</span>
    let newEnd = code.indexOf(markerSpanText) + markerSpanText.length;
    code = code.substring(0, newEnd) + '\n' + block + code.substring(newEnd);
    
    fs.writeFileSync('packages/ui/src/TaskList/TaskRow.tsx', code);
    console.log("Moved via substring!");
} else {
    console.log("Markers not found");
}
