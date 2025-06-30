const fs = require('fs');
const { createCanvas } = require('canvas');

// Create 192x192 icon
const canvas192 = createCanvas(192, 192);
const ctx192 = canvas192.getContext('2d');

// Black background with rounded corners
ctx192.fillStyle = '#000000';
ctx192.fillRect(0, 0, 192, 192);

// White circle
ctx192.fillStyle = '#ffffff';
ctx192.beginPath();
ctx192.arc(96, 88, 40, 0, 2 * Math.PI);
ctx192.fill();

// White rectangle
ctx192.fillRect(64, 136, 64, 8);

// Dollar sign
ctx192.fillStyle = '#000000';
ctx192.font = 'bold 24px Arial';
ctx192.textAlign = 'center';
ctx192.fillText('$', 96, 100);

// Save 192x192 icon
const buffer192 = canvas192.toBuffer('image/png');
fs.writeFileSync('icon-192x192.png', buffer192);

// Create 512x512 icon
const canvas512 = createCanvas(512, 512);
const ctx512 = canvas512.getContext('2d');

// Black background
ctx512.fillStyle = '#000000';
ctx512.fillRect(0, 0, 512, 512);

// White circle
ctx512.fillStyle = '#ffffff';
ctx512.beginPath();
ctx512.arc(256, 234, 106, 0, 2 * Math.PI);
ctx512.fill();

// White rectangle
ctx512.fillRect(170, 362, 172, 22);

// Dollar sign
ctx512.fillStyle = '#000000';
ctx512.font = 'bold 64px Arial';
ctx512.textAlign = 'center';
ctx512.fillText('$', 256, 270);

// Save 512x512 icon
const buffer512 = canvas512.toBuffer('image/png');
fs.writeFileSync('icon-512x512.png', buffer512);

console.log('Icons created successfully!');
