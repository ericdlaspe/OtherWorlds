import React, { useRef } from 'react';
import Sketch from 'react-p5';
import MersenneTwister from 'mersenne-twister';

/*
Create your Custom style to be turned into a EthBlock.art Mother NFT

Basic rules:
 - use a minimum of 1 and a maximum of 4 "modifiers", modifiers are values between 0 and 1,
 - use a minimum of 1 and a maximum of 3 colors, the color "background" will be set at the canvas root
 - Use the block as source of entropy, no Math.random() allowed!
 - You can use a "shuffle bag" using data from the block as seed, a MersenneTwister library is provided

 Arguments:
  - block: the blockData, in this example template you are given 3 different blocks to experiment with variations, check App.js to learn more
  - mod[1-3]: template modifier arguments with arbitrary defaults to get your started
  - color: template color argument with arbitrary default to get you started

Getting started:
 - Write p5.js code, comsuming the block data and modifier arguments,
   make it cool and use no random() internally, component must be pure, output deterministic
 - Customize the list of arguments as you wish, given the rules listed below
 - Provide a set of initial /default values for the implemented arguments, your preset.
 - Think about easter eggs / rare attributes, display something different every 100 blocks? display something unique with 1% chance?

 - check out p5.js documentation for examples!
*/

let DEFAULT_SIZE = 500;
const CustomStyle = ({
  block,
  canvasRef,
  attributesRef,
  width,
  height,
  handleResize,
  mod1 = 0.75, // Example: replace any number in the code with mod1, mod2, or color values
  mod2 = 0.25,
  mod3 = 0.25,
  color1 = '#503752',
  background = '#000000',
}) => {
  const shuffleBag = useRef();
  const hoistedValue = useRef();

  const { hash } = block;

  const Erc20Prefixes = new Set(["0xa9059cbb", "0x23b872dd", "0x18160ddd", "0x70a08231", "0xdd62ed3e", "0x095ea7b3"])
  const NFTPrefixes = new Set(["0x1249c58b", "0x672a9400", "0x40c10f19", "0x449a52f8", "0xa140ae23"])
  const NFTMarketAddrs = new Set(["0xaa84f7c9164db5c11b9fa65ad0118977c12a4729",
                                  "0xb80fbf6cdb49c33dc6ae4ca11af8ac47b0b4c0f3",
                                  "0x495f947276749ce646f68ac8c248420045cb7b5e",
                                  "0x60f80121c31a0d46b5279700f9df786054aa5ee5",
                                  "0x3b3ee1931dc30c1957379fac9aba94d1c48a5405",
                                  "0x2a46f2ffd99e19a89476e2f62270e0a35bbf0756",
                                  "0xfbeef911dc5821886e1dda71586d90ed28174b7d",
                                  "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
                                  "0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0",
                                  "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
                                  "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
                                  "0x06012c8cf97bead5deae237070f9587f8e7a266d",
                                  "0xf5b0a3efb8e8e4c201e2a935f110eaaf3ffecb8d"])

  const gasLimit = Number.parseInt(block.gasLimit.hex, 16)
  const gasUsed = Number.parseInt(block.gasUsed.hex, 16)

  const ringArr = []
  let txnValueMax = 0
  block.transactions.forEach(txn => {
    // Get the transaction:
    // * value
    // * 4 bytes of the data
    // * to address
    let txnValue = Number.parseInt(txn.value.hex, 16)
    let txnDataHex = txn.data.slice(0, 10)
    let txnTo = txn.to;

    if (typeof txnTo === 'string') {
      txnTo = txnTo.toLowerCase()
    } else {
      txnTo = ''
    }

    if (txnValue > 0) {
      ringArr.push([txnValue, txnDataHex, txnTo])
    }

    if (txnValue > txnValueMax) {
      txnValueMax = txnValue
    }
  })

  // setup() initializes p5 and the canvas element, can be mostly ignored in our case (check draw())
  const setup = (p5, canvasParentRef) => {
    // Keep reference of canvas element for snapshots
    p5.createCanvas(width, height).parent(canvasParentRef);
    canvasRef.current = p5;

    attributesRef.current = () => {
      return {
        // This is called when the final image is generated, when creator opens the Mint NFT modal.
        // should return an object structured following opensea/enjin metadata spec for attributes/properties
        // https://docs.opensea.io/docs/metadata-standards
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md#erc-1155-metadata-uri-json-schema

        attributes: [
          {
            display_type: 'number',
            trait_type: 'your trait here number',
            value: hoistedValue.current, // using the hoisted value from within the draw() method, stored in the ref.
          },

          {
            trait_type: 'your trait here text',
            value: 'replace me',
          },
        ],
      };
    };

  };


  // draw() is called right after setup and in a loop
  // disabling the loop prevents controls from working correctly
  // code must be deterministic so every loop instance results in the same output

  // Basic example of a drawing something using:
  // a) the block hash as initial seed (shuffleBag)
  // b) individual transactions in a block (seed)
  // c) custom parameters creators can customize (mod1, color1)
  // d) final drawing reacting to screen resizing (M)
  const draw = (p5) => {

    let WIDTH = width;
    let HEIGHT = height;

    // reset shuffle bag
    let seed = parseInt(hash.slice(0, 16), 16);
    shuffleBag.current = new MersenneTwister(seed);

    // Set the global random seed that determines everything
    let p5Seed = shuffleBag.current.random()
    p5.randomSeed(p5Seed);
    p5.noiseSeed(p5Seed);
    // Burn one. The first "random" coming out of this function is always
    // the same... or too close to the same for my liking
    p5.random();

    // example assignment of hoisted value to be used as NFT attribute later
    hoistedValue.current = 42;


    // UTILITY /////////////////////////////////////////////////////////////////////
    function getHSLA(c) {
      return [p5.hue(c), p5.saturation(c), p5.lightness(c), p5.alpha(c)]
    }

    function circlesCollide(x1, y1, d1, x2, y2, d2) {
      if (p5.dist(x1, y1, x2, y2) < (d1 / 2 + d2 / 2))
        return true
      return false
    }

    // Takes the first 4 bytes of transaction's data (the "signature")
    // and determines if it contains an ERC-20 contract
    function isTransactionERC20(txnDataPrefix) {
      return Erc20Prefixes.has(txnDataPrefix)
    }

    // Takes the first 4 bytes of transaction's data (the "signature")
    // and the "to address" to determine if it contains an NFT
    function isTransactionNFT(txnDataPrefix, txnTo) {
      return (NFTPrefixes.has(txnDataPrefix) || NFTMarketAddrs.has(txnTo))
    }

    // Fisher-Yates shuffle algorithm implementation
    // from https://www.w3docs.com/snippets/javascript/how-to-randomize-shuffle-a-javascript-array.html
    function shuffleArray(array) {
      let curId = array.length;
      // There remain elements to shuffle
      while (curId !== 0) {
        // Pick a remaining element
        let randId = Math.floor(shuffleBag.current.random() * curId)
        curId -= 1
        // Swap it with the current element
        let tmp = array[curId]
        array[curId] = array[randId]
        array[randId] = tmp
      }
      return array
    }

    // CLASSES /////////////////////////////////////////////////////////////////////
    class Palette {
      constructor(name, c0, c1, c2, c3, c4) {
        this.colors = shuffleArray([c0, c1, c2, c3, c4]);
        this.name = name;
        // Each object uses one of the major palette colors
        // which are shuffled per canvas
        this.sky = this.colors[0];
        this.ground = this.colors[1];
        this.sun = this.colors[2];
        this.mountain = this.colors[3];
        this.moon = this.colors[4];
      }

      reshuffle() {
        this.colors = shuffleArray(this.colors)
        this.sky = this.colors[0];
        this.ground = this.colors[1];
        this.sun = this.colors[2];
        this.mountain = this.colors[3];
        this.moon = this.colors[4];
      }

      random() {
        return p5.random(this.colors);
      }
    }

    class Ring {
      constructor(x1, y1, x2, y2, width, c) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        // Int
        this.width = width;
        this.c = c;
      }

      draw() {
        p5.push();
        p5.noFill();

        // Glow lines
        const glowC = this.c
        glowC.setAlpha(0.1)
        p5.stroke(glowC)
        p5.line(this.x1 - 2, this.y1, this.x2 - 2, this.y2);
        p5.line(this.x1 - 1, this.y1, this.x2 - 1, this.y2);
        p5.line(this.x1 + this.width, this.y1, this.x2 + this.width, this.y2);
        p5.line(this.x1 + this.width + 1, this.y1, this.x2 + this.width + 1, this.y2);

        p5.stroke(this.c);

        for (let xOff = 0; xOff < this.width; xOff++)
          p5.line(this.x1 + xOff, this.y1, this.x2 + xOff, this.y2);
          p5.pop();
        }

    }

    class RingGroup {
      constructor(x1, y1, x2, y2, c, spread, ringArr) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.c = c;
        this.spread = spread;

        // Constrain positions to ensure rings overlap the viewing window
        let randomXAdjustment = p5.random(WIDTH, WIDTH * 1.5);

        while (this.x1 < 0 && this.x2 < 0)
        this.x2 += randomXAdjustment;

        while (this.x1 > WIDTH && this.x2 > WIDTH)
        this.x2 -= randomXAdjustment;

        this.shapes = [];

        // Draw lines or rectangles from x1, y1 to x2, y2, plus some x offset
        for (let n = 0; n < ringArr.length; n++) {
          let [txnVal, dataPrefix, txnTo] = ringArr[n]
          // 1000 ETH max end of range
          let ringW = Math.floor(p5.map(txnVal, 1, txnValueMax, 1, WIDTH * 0.1, true))
          // If the transaction is an NFT, get a saturated ring color
          // If not, get white
          let [ringH, ringS, ringL] = getHSLA(this.c)
          ringL = p5.random(50, 100)
          let ringA = p5.random(0.2, 0.5)
          let ringColor = p5.color(ringH, ringS, ringL, ringA);

          let xOff = Math.floor(p5.randomGaussian(0, spread));

          let ring = new Ring(this.x1 + xOff,
            this.y1,
            this.x2 + xOff,
            this.y2,
            ringW,
            ringColor);
            this.shapes.push(ring);
          }
        }

        draw() {
          this.shapes.forEach(ring => {
            ring.draw();
          })
        }
    }

    class Mountain {
      // xPos, yPos (baseline, aligned with horizon),
      // xMax (x-axis extent of mountain range),
      // xRes (num pixels between vertices along x-axis),
      // noiseXOffset (offset for getting different output from Perlin noise
      //    function - otherwise, subsequent calls will create the same shape - adds
      //    the specified multiple of canvas width),
      // noiseScale ("chaos" - try 0.01-0.05 for a start),
      // heightScale (peak-to-valley height scaler, in pixels),
      // tightness (curveVertex value -5.0-5.0),
      // c (color)
      constructor(horizon, xPos, yPos, xMax = WIDTH, xRes = 15, noiseXOffset = 0,
        noiseScale = 0.02, heightScale = 100, tightness = 0.0, slope = 0,
        c = p5.color('white')) {
          this.xPos = xPos - xRes;
          this.yPos = yPos;
          this.xMax = xMax;
          this.xRes = xRes;
          this.noiseXOffset = noiseXOffset;
          this.noiseScale = noiseScale;
          this.heightScale = heightScale;
          this.tightness = tightness;
          this.slope = slope;
          this.color = c;

          this.vertices = [];

          let y = 0;

          for (let i = 0, x = this.xPos; x < xMax + 2 * xRes; i++, x += xRes) {
            y = p5.noise(noiseXOffset * WIDTH + x * this.noiseScale) *
            this.heightScale +
            i * slope;

            // Constrain the mountains to above the horizon
            if (y > horizon - yPos)
            y = horizon - yPos;

            this.vertices.push(p5.createVector(x, y));
          }

          // Adjust the starting height of the mountains if they slope upward, since
          // they are drawn left-to-right
          if (this.slope < 0) {
            this.yPos -= y;
          }
        }

        draw() {
          p5.push();
          p5.noStroke();
          p5.fill(this.color)

          p5.curveTightness(this.tightness);
          p5.translate(this.xPos, this.yPos);
          p5.beginShape();
          // Repeat first vertex
          p5.curveVertex(this.vertices[0].x, this.vertices[0].y);
          let i = 0;
          let x = 0, y = 0;
          for (i = 0; i < this.vertices.length; i++) {
            x = this.vertices[i].x;
            y = this.vertices[i].y;
            p5.curveVertex(x, y);
          }
          // Repeat final vertex
          p5.curveVertex(x, y);
          p5.vertex(x, y + HEIGHT);
          p5.vertex(this.vertices[0].x, y + HEIGHT)
          p5.vertex(this.vertices[0].x, this.vertices[0].y)
          p5.vertex(this.vertices[0].x, this.vertices[0].y)
          p5.endShape();
          p5.pop();
        }
    }

    class CelestialBody {
      // x center, y center, diameter, color
      constructor(x, y, d, c) {
        this.x = x;
        this.y = y;
        this.diameter = d;
        this.color = c;
      }

      draw() {
        p5.noStroke();
        p5.fill(this.color);
        p5.circle(this.x, this.y, this.diameter);
      }
    }

    class BackgroundGradient {
      // height percent of canvas, color at top, color at bottom
      constructor(topY, bottomY, topColor, bottomColor, topColorY, bottomColorY) {
        this.topY = topY;
        this.bottomY = bottomY;
        this.topColor = topColor;
        this.bottomColor = bottomColor;
        // topColorY and bottomColorY are the ends of the gradient, beyond which
        // the color will be solid (topColor or bottomColor, respectively)
        this.topColorY = topColorY;
        this.bottomColorY = bottomColorY;
        // this.style = style;
      }

      draw() {
        p5.push();
        p5.colorMode(p5.RGB);

        if (this.topColorY === this.bottomColorY) {
          p5.noStroke()
          p5.fill(c)
          p5.rect(0, this.topY, WIDTH, this.bottomY - this.topY)
          return
        }
        // Top to bottom gradient
        for (let y = this.topY; y <= this.bottomY; y++) {
          let inter = p5.map(y, this.topColorY, this.bottomColorY, 0, 1, true);
          let c = p5.lerpColor(this.topColor, this.bottomColor, inter);;
          p5.stroke(c);
          p5.line(0, y, WIDTH, y);
        }

        p5.pop();
      }
    }


    ////////////////////////////////////////////////////////////////////////////////
    // MAIN ////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

    // Map the ground height percentage to a value from
    // the top (0) to the bottom (HEIGHT) of the canvas
    const groundHeightPct = 0.15;
    let groundTopY = p5.map(groundHeightPct, 0, 1, HEIGHT, 0);

    //// COLOR PALETTE ////
    // Generate or choose a color palette
    const palettes = [
      // Genesis - {"Dark Sky Blue":"96bcc7","Dark Slate Gray":"2a4e57",
      // "Dark Salmon":"f1a287","Liver Organ":"763621","Old Lavender":"7a6174"}
      new Palette('Genesis',
                  p5.color('#96bcc7'), p5.color('#2a4e57'), p5.color('#f1a287'), p5.color('#763621'), p5.color('#7a6174')),
      // Neon Quadratic - bright blue to bright pink
      // LOVE
      new Palette('Neon Quadratic',
                  p5.color('#256dfa'), p5.color('#8753fc'), p5.color('#b333f2'), p5.color('#cb16d9'), p5.color('#d716b5')),
      // Blue to Orange Segmented - from b/L space
      // LIKE
      new Palette('Blue to Orange Segmented',
                  p5.color('#06008a'), p5.color('#6e1374'), p5.color('#a2305b'), p5.color('#cf4e3e'), p5.color('#fa6d01')),
      // Dusty Dusk Quadratic - toned colors from c/H space -
      // pink, orange-yellow, green, blue, purple
      // LIKE
      new Palette('Dusty Dusk Quadratic',
                  p5.color('#aa6173'), p5.color('#827561'), p5.color('#6f7973'), p5.color('#627a86'), p5.color('#866d99')),
      // Orange is the New Black - oranges toned to black from c/L space
      // LOVE
      new Palette('Orange is the New Black',
                  p5.color('#0f0907'), p5.color('#6a574f'), p5.color('#b6816a'), p5.color('#e98658'), p5.color('#f65a03')),
      // Greens of Blue and Yellow Polygon - from H/L space
      // OK, but the brightest "emerald" green is a bit garish (needs tint?)
      new Palette('Greens of Blue and Yellow Polygon',
                  p5.color('#025450'), p5.color('#03250b'), p5.color('#697049'), p5.color('#c3e2bc'), p5.color('#8ecfc5')),
      // Pastel Segment - pale colors from H/L space -
      // pink, yellow-orange, green, blue, purple
      // LOVE
      new Palette('Pastel Segment',
                  p5.color('#fcc2d1'), p5.color('#efcfaa'), p5.color('#b5debd'), p5.color('#9adef0'), p5.color('#d5cffa')),
      // // Darkness Quadratic - dark colors from a/b space -
      // // green, brown, red, violet, purple
      // // DISLIKE
      // new Palette('Darkness Quadratic',
      //             '#0b2204', '#2b1903', '#3a0d16', '#3e012e', '#2c0255'),
    ];

    // Use the mod2 slider to pick a palette
    let mod2Idx = Math.floor(mod2 * palettes.length)
    mod2Idx = (mod2Idx > palettes.length - 1) ? palettes.length - 1 : mod2Idx

    let palette = palettes[mod2Idx];
    // Whenever a new palette is selected, reshuffle it
    palette.reshuffle()

    // Switch to HSL to ease color manipulation
    // Toggling this to RGB can create some interesting effects.
    // Play with that a bit. Maybe it's a good day/night transition?
    p5.colorMode(p5.HSL);

    //// GROUND ////
    let groundH = p5.hue(palette.ground);
    let groundS = p5.saturation(palette.ground);
    let groundL = p5.lightness(palette.ground);
    // let groundC = color(groundH, min(30, groundS), random(groundL, 80));
    // Color saturation at horizon
    const horizonS = 20
    let groundC = p5.color(groundH, horizonS, groundL);
    // Ground gets lighter in fore - anywhere from original to 80% absolute lightness
    // We also make the foreground less saturated
    // let groundCBottom = p5.color(groundH, horizonS + 20, groundL);
    const ground = new BackgroundGradient(groundTopY, HEIGHT, groundC, groundC,
                                          groundTopY + 10, HEIGHT - 20);

    //// SUN ////
    // Random height for the sun:  horizon to top of canvas
    // Sun position depends on ground height
    const [sunH, sunS, sunL] = getHSLA(palette.sun)

    // Sun diameter is proportional to gasUsed/gasLimit
    const sunD = p5.map(gasUsed, 0, gasLimit, WIDTH * 0.5, WIDTH)

    const sunY = p5.random(groundTopY - sunD * 0.4, groundTopY);
    const sunX = p5.random(WIDTH);
    let sunC = p5.color(sunH, Math.max(sunS, 85), 85);
    const sun = new CelestialBody(sunX, sunY, sunD, sunC);

    //// SKY ////
    const [skyH, skyS, skyL] = getHSLA(palette.sky)
    let skyBottomY = groundTopY - 1;
    // Fade from sky color at top to sun color at horizon
    // Sky bottom color is modified to be slightly darker than the sun
    const skyColorBottom = p5.color(p5.hue(sunC), 100, p5.lightness(sunC) - 5);
    const sky = new BackgroundGradient(0, skyBottomY, palette.sky, skyColorBottom,
                                       0, sunY);

    //// MOONS ////
    const moonsMax = 4
    const nMoons = Math.floor(mod3 * moonsMax)
    const moons = []
    let [moonH, moonS, moonL] = getHSLA(palette.moon)

    const moonRands = []
    // 4 randoms used for each moon
    for (let i = 0; i < moonsMax * 4; i++) {
      moonRands.push(p5.random(70, moonL))
      moonRands.push(p5.random(WIDTH * 0.02, WIDTH * 0.20))
      moonRands.push(p5.random(WIDTH))
      moonRands.push(p5.random(groundTopY))
    }

    for (let i = 0; i < nMoons; i++) {
      let moonY = moonRands.pop()
      let moonX = moonRands.pop()
      let moonD = moonRands.pop()
      moonL = moonRands.pop()
      if (circlesCollide(moonX, moonY, moonD, sunX, sunY, sunD))
        moonL = 18
      let moonC = p5.color(moonH, Math.min(moonS, 50), moonL);

      moons.push(new CelestialBody(moonX, moonY, moonD, moonC));
    }

    //// RINGS ////
    // Slider to control ring spread manually
    const ringSpread = WIDTH * mod1

    let ringColor = p5.color(sunH, skyS, sunL);
    // Bottom/left coordinates to top/right coordinates
    const rings = new RingGroup(Math.floor(p5.random(-WIDTH * 0.1, WIDTH)),
                                Math.floor(HEIGHT * 1.1),
                                Math.floor(p5.random(0, WIDTH * 1.1)),
                                Math.floor(-HEIGHT * 0.1),
                                ringColor,
                                ringSpread,
                                ringArr)

    //// MOUNTAINS ////
    const [mtnH, mtnS, mtnL] = getHSLA(palette.mountain);
    const mtnC = p5.color(mtnH,
                          horizonS,
                          mtnL);
    const mtnXPos = 0;
    const mtnXMax = WIDTH;
    const mtnXRes = p5.random(10, 30);
    const mtnNoiseXOffset = 0
    const mtnHeightScale = p5.random(50, 100);
    const mtnNoiseScale = p5.random(0.01, 0.03);
    const mtnTightness = 0.1;

    let mtnSlope = p5.random(-3, 3);
    let mtnYPos = sky.bottomY - HEIGHT * (0.01 * (mtnSlope ** 2) + 0.10);

    // XXX: Make mountains approach lightness (& color?) of sky closer to background
    const mountain1 = new Mountain(ground.topY, mtnXPos, mtnYPos, mtnXMax, mtnXRes,
                                   mtnNoiseXOffset, mtnNoiseScale,
                                   mtnHeightScale, mtnTightness, mtnSlope,
                                   mtnC);
    // mountain2 = new Mountain(mtnXPos, sky.bottomY - HEIGHT * random(0.2, 0.4),
    //                          WIDTH, 15, 1, 0.01, 100, 0.2,
    //                          mountain2Color);
    // mountain3 = new Mountain(mtnXPos, sky.bottomY - HEIGHT * random(0.3, 0.4),
    //                          WIDTH, 15, 2, 0.01, 100, 0.2,
    //                          mountain3Color);

    //// DRAW //////////////////////////////////////////////////////////////////
    // The background is the color of the sky
    p5.clear();
    p5.background(palette.sky);
    sky.draw();
    sun.draw();

    moons.forEach(moon => {
      moon.draw()
    });

    rings.draw();
    mountain1.draw();
    ground.draw();
  };

  return <Sketch setup={setup} draw={draw} windowResized={handleResize} />;
};

export default CustomStyle;

const styleMetadata = {
  name: 'Other Worlds\' Starsets',
  description: 'The mountains, moons, rings, and atmospheres of distant and undiscovered planets at the setting of their closest stars... are brought into view here on the Ethereum blockchain.',
  image: '',
  creator_name: 'Oneironaut',
  options: {
    mod1: 0.025,
    mod2: 0.1,
    mod3: 0.8,
    color1: '#503752',
    background: '#000000',
  },
};

export { styleMetadata };
