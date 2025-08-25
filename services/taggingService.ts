import { Category } from '../types.ts';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@11.1.0';

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


export const extractTags = async (pdfDoc, pageNum, patterns) => {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const foundTags = [];
    const textItems = textContent.items.filter((item) => 'str' in item && item.str.trim() !== '');
    const consumedIndices = new Set();

    // Pass 1: Combine multi-part instrument tags
    const instrumentPrefixRegex = /^[A-Z]{2,3}$/;
    const instrumentNumberRegex = /^\d{3,}$/;

    for (let i = 0; i < textItems.length; i++) {
        if (consumedIndices.has(i)) continue;

        const item1 = textItems[i];
        if (instrumentPrefixRegex.test(item1.str)) {
            const bbox1 = calculateBbox(item1);

            for (let j = 0; j < textItems.length; j++) {
                if (i === j || consumedIndices.has(j)) continue;

                const item2 = textItems[j];
                if (instrumentNumberRegex.test(item2.str)) {
                    const bbox2 = calculateBbox(item2);

                    // Check for spatial proximity (item2 is roughly below item1)
                    const isHorizontallyAligned = Math.abs((bbox1.x1 + bbox1.x2) / 2 - (bbox2.x1 + bbox2.x2) / 2) < 10;
                    const isVerticallyClose = bbox1.y1 > bbox2.y2 && (bbox1.y1 - bbox2.y2) < 10;

                    if (isHorizontallyAligned && isVerticallyClose) {
                        const combinedText = `${item1.str}-${item2.str}`;
                        const combinedBbox = {
                            x1: Math.min(bbox1.x1, bbox2.x1),
                            y1: Math.min(bbox1.y1, bbox2.y1),
                            x2: Math.max(bbox1.x2, bbox2.x2),
                            y2: Math.max(bbox1.y2, bbox2.y2),
                        };

                        foundTags.push({
                            id: uuidv4(),
                            text: combinedText,
                            page: pageNum,
                            bbox: combinedBbox,
                            category: Category.Instrument,
                        });

                        consumedIndices.add(i);
                        consumedIndices.add(j);
                        break; // Found a pair, move to the next item
                    }
                }
            }
        }
    }

    // Pass 2: Process remaining tags with user-defined patterns
    const categoryPatterns = [
        { category: Category.Equipment, regex: patterns[Category.Equipment] },
        { category: Category.Line, regex: patterns[Category.Line] },
        { category: Category.Instrument, regex: patterns[Category.Instrument] },
    ];

    for (let i = 0; i < textItems.length; i++) {
        if (consumedIndices.has(i)) continue;

        const item = textItems[i];
        
        for (const pattern of categoryPatterns) {
            if (!pattern.regex) continue; // Skip if regex is empty
            try {
                const globalRegex = new RegExp(pattern.regex, 'gi');
                const matches = item.str.match(globalRegex);

                if (matches) {
                    for (const matchText of matches) {
                         // Avoid adding duplicates if a combined tag from Pass 1 also matches here
                        const alreadyExists = foundTags.some(tag => tag.text === matchText && tag.page === pageNum);
                        if (!alreadyExists) {
                            foundTags.push({
                                id: uuidv4(),
                                text: matchText,
                                page: pageNum,
                                bbox: calculateBbox(item),
                                category: pattern.category,
                            });
                        }
                    }
                }
            } catch (error) {
                 console.error(`Invalid regex for category ${pattern.category}: ${pattern.regex}`, error);
            }
        }
    }

    return foundTags;
};
