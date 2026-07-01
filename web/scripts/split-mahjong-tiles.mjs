// web/scripts/split-mahjong-tiles.mjs

import fs from "fs";
import path from "path";

const inputPath = path.resolve("scripts/mahjong-panel.svg");
const outputDir = path.resolve("public/mahjong/tiles");

const TILE_WIDTH = 491;
const TILE_HEIGHT = 676;

const idToFilename = {
    "1man": "m1.svg",
    "2man": "m2.svg",
    "3man": "m3.svg",
    "4man": "m4.svg",
    "5man": "m5.svg",
    "6man": "m6.svg",
    "7man": "m7.svg",
    "8man": "m8.svg",
    "9man": "m9.svg",

    "1pin": "p1.svg",
    "2pin": "p2.svg",
    "3pin": "p3.svg",
    "4pin": "p4.svg",
    "5pin": "p5.svg",
    "6pin": "p6.svg",
    "7pin": "p7.svg",
    "8pin": "p8.svg",
    "9pin": "p9.svg",

    "1sou": "s1.svg",
    "2sou": "s2.svg",
    "3sou": "s3.svg",
    "4sou": "s4.svg",
    "5sou": "s5.svg",
    "6sou": "s6.svg",
    "7sou": "s7.svg",
    "8sou": "s8.svg",
    "9sou": "s9.svg",

    ton: "ton.svg",
    nan: "nan.svg",
    xia: "shaa.svg",
    pei: "pei.svg",

    haku: "haku.svg",
    hatsu: "hatsu.svg",
    chun: "chun.svg",

    blank: "blank.svg",
    back: "back.svg",

    aka3man: "red_m3.svg",
    aka3pin: "red_p3.svg",
    aka3sou: "red_s3.svg",

    aka5man: "red_m5.svg",
    aka5pin: "red_p5.svg",
    aka5sou: "red_s5.svg",

    aka7man: "red_m7.svg",
    aka7pin: "red_p7.svg",
    aka7sou: "red_s7.svg",
};

const source = fs.readFileSync(inputPath, "utf8");

const defsMatch = source.match(/<defs[\s\S]*?<\/defs>/);
const rawDefs = defsMatch ? defsMatch[0] : "";

function normalizeDefs(defs) {
    return defs.replace(/<stop\b(?![^>]*\boffset=)/g, '<stop offset="0%"');
}

const defs = normalizeDefs(rawDefs);

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findTileGroup(svg, id) {
    const escapedId = escapeRegExp(id);

    // 원본처럼 <g id="1man" transform="..."> 이 여러 줄이어도 잡히게 처리
    const startRegex = new RegExp(
        `<g\\b(?=[^>]*\\bid=["']${escapedId}["'])[^>]*>`,
        "m",
    );

    const startMatch = svg.match(startRegex);

    if (!startMatch || startMatch.index === undefined) {
        return null;
    }

    const startIndex = startMatch.index;
    let cursor = startIndex + startMatch[0].length;
    let depth = 1;

    const groupTagRegex = /<\/?g\b[^>]*>/g;
    groupTagRegex.lastIndex = cursor;

    while (depth > 0) {
        const groupTagMatch = groupTagRegex.exec(svg);

        if (!groupTagMatch) {
            throw new Error(`닫는 </g>를 찾지 못했습니다: ${id}`);
        }

        if (groupTagMatch[0].startsWith("</g")) {
            depth -= 1;
        } else {
            depth += 1;
        }

        cursor = groupTagRegex.lastIndex;
    }

    return svg.slice(startIndex, cursor);
}

function getTranslate(groupSvg) {
    const transformMatch = groupSvg.match(
        /transform=["']translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)["']/,
    );

    if (!transformMatch) {
        return { x: 0, y: 0 };
    }

    return {
        x: Number(transformMatch[1]),
        y: Number(transformMatch[2]),
    };
}

function buildSingleTileSvg(groupSvg, translate) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${TILE_WIDTH}"
  height="${TILE_HEIGHT}"
  viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}"
  preserveAspectRatio="xMidYMid meet">
  ${defs}

  <!--
    This file keeps the original tile frame path.
    The frame path contains both tile background and outline:
    fill:url(#tileface); stroke:url(#tileframe)
  -->
  <g transform="translate(${-translate.x}, ${-translate.y})">
${groupSvg}
  </g>
</svg>
`;
}

const missingIds = [];

for (const [id, filename] of Object.entries(idToFilename)) {
    const groupSvg = findTileGroup(source, id);

    if (!groupSvg) {
        missingIds.push(id);
        continue;
    }

    const hasFrame = /id=["']frame-[^"']+["']/.test(groupSvg);
    const hasTileFace = /tileface/.test(groupSvg);
    const hasTileFrame = /tileframe/.test(groupSvg);

    if (!hasFrame && id !== "blank" && id !== "back") {
        console.warn(`주의: #${id} 안에서 frame-* path를 찾지 못했습니다.`);
    }

    if (!hasTileFace && id !== "blank" && id !== "back") {
        console.warn(`주의: #${id} 안에서 tileface 배경을 찾지 못했습니다.`);
    }

    if (!hasTileFrame && id !== "blank" && id !== "back") {
        console.warn(`주의: #${id} 안에서 tileframe 외곽선을 찾지 못했습니다.`);
    }

    const translate = getTranslate(groupSvg);
    const singleTileSvg = buildSingleTileSvg(groupSvg, translate);
    const outputPath = path.join(outputDir, filename);

    fs.writeFileSync(outputPath, singleTileSvg, "utf8");
    console.log(`created ${filename} from #${id}`);
}

if (missingIds.length > 0) {
    console.warn("\n찾지 못한 id:");
    for (const id of missingIds) {
        console.warn(`- ${id}`);
    }
}