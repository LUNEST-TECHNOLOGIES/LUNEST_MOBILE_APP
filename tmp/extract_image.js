const fs = require('fs');
const path = require('path');

const files = [
  { 
    svg: 'c:/Users/AkintayoPC/Documents/Lunest_app/lunest-mobile/src/assets/icons/bookings/image_frame.svg',
    png: 'c:/Users/AkintayoPC/Documents/Lunest_app/lunest-mobile/src/assets/icons/bookings/image_frame_bg.png'
  },
  { 
    svg: 'c:/Users/AkintayoPC/Documents/Lunest_app/lunest-mobile/src/assets/icons/bookings/cancel.svg',
    png: 'c:/Users/AkintayoPC/Documents/Lunest_app/lunest-mobile/src/assets/icons/bookings/cancel_bg.png'
  },
  { 
    svg: 'c:/Users/AkintayoPC/Documents/Lunest_app/lunest-mobile/src/assets/icons/bookings/confetti.svg',
    png: 'c:/Users/AkintayoPC/Documents/Lunest_app/lunest-mobile/src/assets/icons/bookings/confetti_bg.png'
  }
];

files.forEach(f => {
  if (!fs.existsSync(f.svg)) return;
  const svgContent = fs.readFileSync(f.svg, 'utf8');
  const base64Match = svgContent.match(/xlink:href="data:image\/png;base64,([^"]+)"/);

  if (base64Match && base64Match[1]) {
    const buffer = Buffer.from(base64Match[1], 'base64');
    fs.writeFileSync(f.png, buffer);
    console.log('✅ Extracted: ' + path.basename(f.png) + ' (' + (buffer.length / 1024).toFixed(2) + ' KB)');
  } else {
    console.error('❌ No base64 in ' + path.basename(f.svg));
  }
});
