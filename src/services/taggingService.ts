import { Category } from '../types.ts';
import { v4 as uuidv4 } from 'uuid';

// Helper function to calculate bounding box
const calculateBbox = (item) => {
    const { transform, width, height } = item;
    const [a, b, , , e, f] = transform;
    const x = e;
    const y = f;
    const angle = Math.atan2(b, a);
    const descent = height * 0.2;
    const localCorners = [
        { x: 0, y: -descent }, { x: width, y: -descent },
        { x: width, y: height }, { x: 0, y: height },
    ];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const transformedCorners = localCorners.map(p => ({
        x: p.x * cos - p.y * sin + x,
        y: p.x * sin + p.y * cos + y,
    }));
    const xs = transformedCorners.map(p => p.x);
    const ys = transformedCorners.map(p => p.y);
    return {
        x1: Math.min(...xs), y1: Math.min(...ys),
        x2: Math.max(...xs), y2: Math.max(...ys),
    };
};


export const extractTags = async (pdfDoc, pageNum, patterns, tolerances) => {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const foundTags = [];
    const rawTextItems = [];
    const textItems = textContent.items.filter((item) => 'str' in item && item.str.trim() !== '');
    const consumedIndices = new Set();
    
    // Pass 1: Combine multi-part instrument tags using tolerances
    if (patterns[Category.Instrument] && patterns[Category.Instrument].func && patterns[Category.Instrument].num) {
        try {
            const funcRegex = new RegExp(`^${patterns[Category.Instrument].func}$`);
            const numRegex = new RegExp(`^${patterns[Category.Instrument].num}$`);
            const instrumentTolerances = tolerances[Category.Instrument];

            const funcCandidates = [];
            const numCandidates = [];

            textItems.forEach((item, index) => {
                if (funcRegex.test(item.str)) {
                    funcCandidates.push({ item, index, bbox: calculateBbox(item) });
                } else if (numRegex.test(item.str)) {
                    numCandidates.push({ item, index, bbox: calculateBbox(item) });
                }
            });

            for (const func of funcCandidates) {
                if (consumedIndices.has(func.index)) continue;

                let bestPartner = null;
                let minDistanceSq = Infinity;

                const funcCenter = {
                    x: (func.bbox.x1 + func.bbox.x2) / 2,
                    y: (func.bbox.y1 + func.bbox.y2) / 2,
                };
                
                for (const num of numCandidates) {
                    if (consumedIndices.has(num.index)) continue;
                    
                    const numCenter = {
                        x: (num.bbox.x1 + num.bbox.x2) / 2,
                        y: (num.bbox.y1 + num.bbox.y2) / 2,
                    };

                    // Function part must be strictly above the number part.
                    if (funcCenter.y <= numCenter.y) {
                        continue;
                    }

                    const dx = Math.abs(funcCenter.x - numCenter.x);
                    const dy = Math.abs(funcCenter.y - numCenter.y);
                    
                    if (dx <= instrumentTolerances.horizontal && dy <= instrumentTolerances.vertical) {
                        const distanceSq = dx * dx + dy * dy;
                        if (distanceSq < minDistanceSq) {
                            minDistanceSq = distanceSq;
                            bestPartner = num;
                        }
                    }
                }

                if (bestPartner) {
                    const combinedText = `${func.item.str}-${bestPartner.item.str}`;

                    const combinedBbox = {
                        x1: Math.min(func.bbox.x1, bestPartner.bbox.x1),
                        y1: Math.min(func.bbox.y1, bestPartner.bbox.y1),
                        x2: Math.max(func.bbox.x2, bestPartner.bbox.x2),
                        y2: Math.max(func.bbox.y2, bestPartner.bbox.y2),
                    };

                    foundTags.push({
                        id: uuidv4(),
                        text: combinedText,
                        page: pageNum,
                        bbox: combinedBbox,
                        category: Category.Instrument,
                        sourceItems: [
                            {...func.item, id: uuidv4(), bbox: func.bbox, page: pageNum}, 
                            {...bestPartner.item, id: uuidv4(), bbox: bestPartner.bbox, page: pageNum}
                        ]
                    });

                    consumedIndices.add(func.index);
                    consumedIndices.add(bestPartner.index);
                }
            }
        } catch (e) {
            console.error("Error processing instrument tags:", e);
        }
    }


    // Pass 2: Process remaining tags with user-defined patterns
    const categoryPatterns = [
        { category: Category.Equipment, regex: patterns[Category.Equipment] },
        { category: Category.Line, regex: patterns[Category.Line] },
        { category: Category.NotesAndHolds, regex: patterns[Category.NotesAndHolds] },
    ];

    for (let i = 0; i < textItems.length; i++) {
        if (consumedIndices.has(i)) continue;

        const item = textItems[i];
        let itemHasBeenTagged = false;
        
        for (const pattern of categoryPatterns) {
            if (!pattern.regex) continue; // Skip if regex is empty
            try {
                const globalRegex = new RegExp(pattern.regex, 'gi');
                const matches = item.str.match(globalRegex);

                if (matches) {
                    itemHasBeenTagged = true;
                    for (const matchText of matches) {
                        foundTags.push({
                            id: uuidv4(),
                            text: matchText,
                            page: pageNum,
                            bbox: calculateBbox(item),
                            category: pattern.category,
                        });
                    }
                }
            } catch (error) {
                 console.error(`Invalid regex for category ${pattern.category}: ${pattern.regex}`, error);
            }
        }

        if (itemHasBeenTagged) {
            consumedIndices.add(i);
        }
    }
    
    // Pass 3: Find drawing number (one per page, closest to bottom-right corner)
    const drawingNumberRegexString = patterns[Category.DrawingNumber];
    if (drawingNumberRegexString) {
        try {
            const drawingNumberRegex = new RegExp(drawingNumberRegexString, 'i');
            const { width: pageWidth, height: pageHeight } = page.getViewport({ scale: 1.0 });

            let bestCandidate = null;
            let minDistanceSq = Infinity;

            for (let i = 0; i < textItems.length; i++) {
                if (consumedIndices.has(i)) continue;
                
                const item = textItems[i];
                const match = item.str.match(drawingNumberRegex);
                
                if (match) {
                    const bbox = calculateBbox(item);
                    // Calculate squared distance from bottom-right corner of the bbox 
                    // to the bottom-right corner of the page (pageWidth, 0).
                    const dx = pageWidth - bbox.x2;
                    const dy = bbox.y1 - 0;
                    const distanceSq = dx * dx + dy * dy;

                    if (distanceSq < minDistanceSq) {
                        minDistanceSq = distanceSq;
                        bestCandidate = { item, index: i, bbox, text: match[0] };
                    }
                }
            }

            if (bestCandidate) {
                foundTags.push({
                    id: uuidv4(),
                    text: bestCandidate.text,
                    page: pageNum,
                    bbox: bestCandidate.bbox,
                    category: Category.DrawingNumber,
                });
                consumedIndices.add(bestCandidate.index);
            }
        } catch (error) {
            console.error(`Invalid regex for Drawing Number: ${drawingNumberRegexString}`, error);
        }
    }

    // Final Pass: Collect all un-tagged items as raw text
    for (let i = 0; i < textItems.length; i++) {
        if (consumedIndices.has(i)) continue;
        const item = textItems[i];
        rawTextItems.push({
            id: uuidv4(),
            text: item.str,
            page: pageNum,
            bbox: calculateBbox(item),
         });
    }

    return { tags: foundTags, rawTextItems };
};
