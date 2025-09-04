import { Category } from '../types.ts';
import { v4 as uuidv4 } from 'uuid';

// Helper function to remove whitespace from tag text (except for NotesAndHolds)
const removeWhitespace = (text, category, shouldRemoveWhitespace) => {
    if (!shouldRemoveWhitespace || category === Category.NotesAndHolds) {
        return text;
    }
    return text.replace(/\s+/g, '');
};


// Helper function to calculate bounding box with screen coordinate transformation
const calculateBbox = (item, viewBoxOffsetX = 0, viewBoxOffsetY = 0, viewport = null, rotation = 0) => {
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
        x: p.x * cos - p.y * sin + x - viewBoxOffsetX,  // Apply viewBox offset
        y: p.x * sin + p.y * cos + y - viewBoxOffsetY,  // Apply viewBox offset
    }));
    
    const xs = transformedCorners.map(p => p.x);
    const ys = transformedCorners.map(p => p.y);
    const pdfBbox = {
        x1: Math.min(...xs), y1: Math.min(...ys),
        x2: Math.max(...xs), y2: Math.max(...ys),
    };
    
    // Handle different PDF rotations and coordinate system transformations
    if (viewport && rotation === 90) {
        // 90-degree rotation: swap X and Y coordinates with proper flipping
        const viewBox = viewport.viewBox || [0, 0, viewport.width, viewport.height];
        const viewBoxWidth = viewBox[2];
        const viewBoxHeight = viewBox[3];
        
        return {
            x1: pdfBbox.y1,                      // Y becomes X (no flip)
            y1: pdfBbox.x1,                      // X becomes Y (no flip)
            x2: pdfBbox.y2,                      // Y becomes X (no flip)
            y2: pdfBbox.x2,                      // X becomes Y (no flip)
        };
    } else if (viewport && rotation === 270) {
        // 270-degree rotation: Final coordinate transformation
        // Transform: [0, -1, -1, 0, 2880, 2016] shows proper rotation
        // ViewBox: [0, 0, 2016, 2880] - width/height are swapped as expected
        
        // PROBLEM: Many coordinates are negative, meaning our transformation is wrong
        // For 270° rotation (clockwise), we need: original_x -> new_y, original_y -> new_x (with flips)
        // But we need to use ViewBox dimensions, not viewport dimensions
        
        const viewBox = viewport.viewBox || [0, 0, viewport.width, viewport.height];
        const viewBoxWidth = viewBox[2];   // 2016
        const viewBoxHeight = viewBox[3];  // 2880
        
        // Correct 270° rotation using ViewBox dimensions
        return {
            x1: viewBoxHeight - pdfBbox.y2,    // Y becomes X (flipped from viewBox height)
            y1: viewBoxWidth - pdfBbox.x2,     // X becomes Y (flipped from viewBox width)
            x2: viewBoxHeight - pdfBbox.y1,    // Y becomes X (flipped from viewBox height)
            y2: viewBoxWidth - pdfBbox.x1,     // X becomes Y (flipped from viewBox width)
        };
    } else if (viewport && rotation === 180) {
        // 180-degree rotation: flip both X and Y
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        return {
            x1: pageWidth - pdfBbox.x2,
            y1: pageHeight - pdfBbox.y2,
            x2: pageWidth - pdfBbox.x1, 
            y2: pageHeight - pdfBbox.y1,
        };
    } else if (viewport) {
        // Non-rotated documents (0 degrees): flip Y coordinates to match screen coordinate system
        // PDF uses bottom-left origin (0,0), screen uses top-left origin (0,0)
        const pageHeight = viewport.height;
        return {
            x1: pdfBbox.x1,
            y1: pageHeight - pdfBbox.y2,  // Flip Y: bottom becomes top
            x2: pdfBbox.x2, 
            y2: pageHeight - pdfBbox.y1,  // Flip Y: top becomes bottom
        };
    }
    
    // Fallback for cases without viewport information
    return pdfBbox;
};

// Get the right-bottom corner coordinates considering PDF rotation
// PDF coordinates: Y=0 is TOP, Y=height is BOTTOM
const getRightBottomCorner = (viewport, rotation) => {
    const { width: pageWidth, height: pageHeight } = viewport;
    
    switch (rotation) {
        case 0:
            // Normal orientation: right-bottom corner is at (pageWidth, pageHeight)
            return { x: pageWidth, y: pageHeight };
        case 90:
            // 90° rotation: right-bottom becomes (0, pageHeight) in transformed coordinates  
            return { x: 0, y: pageHeight };
        case 180:
            // 180° rotation: right-bottom becomes (0, 0) in transformed coordinates
            return { x: 0, y: 0 };
        case 270:
            // 270° rotation: right-bottom becomes (pageHeight, 0) in transformed coordinates
            return { x: pageHeight, y: 0 };
        default:
            // Fallback to normal orientation
            return { x: pageWidth, y: pageHeight };
    }
};

export const extractTags = async (pdfDoc, pageNum, patterns, tolerances, appSettings = { autoRemoveWhitespace: true }) => {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const rotation = viewport.rotation || 0;
    
    // Get the viewBox offset - some PDFs have non-zero origin
    const viewBoxOffsetX = viewport.viewBox ? viewport.viewBox[0] : 0;
    const viewBoxOffsetY = viewport.viewBox ? viewport.viewBox[1] : 0;
    
    
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
                    const bbox = calculateBbox(item, viewBoxOffsetX, viewBoxOffsetY, viewport, rotation);
                    funcCandidates.push({ item, index, bbox });
                    if (item.str === "TXT") {
                        const center = { x: (bbox.x1 + bbox.x2) / 2, y: (bbox.y1 + bbox.y2) / 2 };
                    }
                } else if (numRegex.test(item.str)) {
                    const bbox = calculateBbox(item, viewBoxOffsetX, viewBoxOffsetY, viewport, rotation);
                    numCandidates.push({ item, index, bbox });
                    if (item.str === "596B") {
                        const center = { x: (bbox.x1 + bbox.x2) / 2, y: (bbox.y1 + bbox.y2) / 2 };
                    }
                } else if (item.str === "TXT" || item.str === "596B") {
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

                if (func.item.str === "TXT") {
                }
                
                for (const num of numCandidates) {
                    if (consumedIndices.has(num.index)) continue;
                    
                    const numCenter = {
                        x: (num.bbox.x1 + num.bbox.x2) / 2,
                        y: (num.bbox.y1 + num.bbox.y2) / 2,
                    };

                    if (func.item.str === "TXT" && num.item.str === "596B") {
                    }

                    // Function part must be strictly above the number part
                    const isAbove = funcCenter.y < numCenter.y;

                    if (func.item.str === "TXT" && num.item.str === "596B") {
                    }

                    if (!isAbove) {
                        if (func.item.str === "TXT" && num.item.str === "596B") {
                        }
                        continue;
                    }

                    const dx = Math.abs(funcCenter.x - numCenter.x);
                    const dy = Math.abs(funcCenter.y - numCenter.y);
                    
                    if (func.item.str === "TXT" && num.item.str === "596B") {
                    }
                    
                    if (dx <= instrumentTolerances.horizontal && dy <= instrumentTolerances.vertical) {
                        const distanceSq = dx * dx + dy * dy;
                        if (func.item.str === "TXT" && num.item.str === "596B") {
                        }
                        if (distanceSq < minDistanceSq) {
                            minDistanceSq = distanceSq;
                            bestPartner = num;
                            if (func.item.str === "TXT" && num.item.str === "596B") {
                            }
                        }
                    } else {
                        if (func.item.str === "TXT" && num.item.str === "596B") {
                        }
                    }
                }

                if (bestPartner) {
                    // Function part should always come first (it's above the number part)
                    // We already verified func is above bestPartner in the matching logic
                    const rawCombinedText = `${func.item.str}-${bestPartner.item.str}`;
                    const combinedText = removeWhitespace(rawCombinedText, Category.Instrument, appSettings.autoRemoveWhitespace);

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
        }
    }


    // Pass 2: Process remaining tags with user-defined patterns
    const categoryPatterns = [
        { category: Category.Equipment, regex: patterns[Category.Equipment] },
        { category: Category.Line, regex: patterns[Category.Line] },
        { category: Category.NotesAndHolds, regex: patterns[Category.NotesAndHolds] },
        { category: Category.SpecialItem, regex: patterns[Category.SpecialItem] },
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
                        const cleanedText = removeWhitespace(matchText, pattern.category, appSettings.autoRemoveWhitespace);
                        foundTags.push({
                            id: uuidv4(),
                            text: cleanedText,
                            page: pageNum,
                            bbox: calculateBbox(item, viewBoxOffsetX, viewBoxOffsetY, viewport, rotation),
                            category: pattern.category,
                        });
                    }
                }
            } catch (error) {
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
            const rightBottomCorner = getRightBottomCorner(viewport, rotation);

            let bestCandidate = null;
            let minDistanceSq = Infinity;
            const candidates = []; // For debugging

            // First pass: collect all Drawing Number candidates with metadata
            for (let i = 0; i < textItems.length; i++) {
                if (consumedIndices.has(i)) continue;
                
                const item = textItems[i];
                const match = item.str.match(drawingNumberRegex);
                
                if (match) {
                    const bbox = calculateBbox(item, viewBoxOffsetX, viewBoxOffsetY, viewport, rotation);
                    
                    // Calculate distance to bottom-right corner
                    // Use the bottom-right point of the text bbox for distance calculation
                    const dx = rightBottomCorner.x - bbox.x2;  // Distance from right edge
                    let targetY;
                    switch (rotation) {
                        case 0:
                            // 0°: Y increases downward, so max Y is bottom
                            targetY = Math.max(bbox.y1, bbox.y2);
                            break;
                        case 90:
                            // 90°: After rotation, max Y is still bottom
                            targetY = Math.max(bbox.y1, bbox.y2);
                            break;
                        case 180:
                            // 180°: After rotation, min Y is bottom
                            targetY = Math.min(bbox.y1, bbox.y2);
                            break;
                        case 270:
                            // 270°: After rotation, min Y is bottom  
                            targetY = Math.min(bbox.y1, bbox.y2);
                            break;
                        default:
                            targetY = Math.max(bbox.y1, bbox.y2);
                            break;
                    }
                    const dy = rightBottomCorner.y - targetY;   // Distance from bottom edge
                    const distanceSq = dx * dx + dy * dy;
                    const distance = Math.sqrt(distanceSq);

                    // Store candidate for debugging
                    candidates.push({
                        item,
                        index: i,
                        bbox,
                        text: match[0],
                        distance,
                        distanceSq,
                        dx,
                        dy,
                        targetY,
                        isSelected: false
                    });
                }
            }

            // Simple selection: closest distance to bottom-right corner
            for (const candidate of candidates) {
                if (candidate.distanceSq < minDistanceSq) {
                    minDistanceSq = candidate.distanceSq;
                    bestCandidate = candidate;
                }
            }

            // Mark selected candidate for debugging
            if (bestCandidate) {
                candidates.forEach(c => {
                    c.isSelected = (c.index === bestCandidate.index);
                });
            }

            // Debug logging for Drawing Number selection
            if (candidates.length > 0) {
                console.log(`🎯 DRAWING NUMBER DEBUG - Page ${pageNum}`);
                console.log(`🔄 Page rotation: ${rotation}°, Right-bottom corner: (${rightBottomCorner.x.toFixed(1)}, ${rightBottomCorner.y.toFixed(1)})`);
                console.log(`📊 Found ${candidates.length} candidates:`);
                
                // Sort by distance for easier reading
                const sortedCandidates = [...candidates].sort((a, b) => a.distance - b.distance);
                sortedCandidates.forEach((candidate, index) => {
                    const marker = candidate.isSelected ? '🏆 SELECTED:' : `${index + 1}.`;
                    console.log(`${marker} "${candidate.text}"`);
                    console.log(`   📍 Position: X=${candidate.bbox.x1.toFixed(1)}-${candidate.bbox.x2.toFixed(1)}, Y=${candidate.bbox.y1.toFixed(1)}-${candidate.bbox.y2.toFixed(1)}`);
                    console.log(`   📏 Distance: ${candidate.distance.toFixed(2)} (dx=${candidate.dx.toFixed(1)}, dy=${candidate.dy.toFixed(1)}, targetY=${candidate.targetY.toFixed(1)})`);
                });
                console.log(`════════════════════════════════════════`);
            }

            if (bestCandidate) {
                const cleanedText = removeWhitespace(bestCandidate.text, Category.DrawingNumber, appSettings.autoRemoveWhitespace);
                foundTags.push({
                    id: uuidv4(),
                    text: cleanedText,
                    page: pageNum,
                    bbox: bestCandidate.bbox,
                    category: Category.DrawingNumber,
                });
                consumedIndices.add(bestCandidate.index);
            }
        } catch (error) {
        }
    }

    // OPC Pass: Find Off-Page Connector tags (Drawing Number + Reference combination)
    if (drawingNumberRegexString && patterns[Category.OffPageConnector]) {
        const drawingNumberRegex = new RegExp(drawingNumberRegexString);
        const opcReferenceRegex = new RegExp(patterns[Category.OffPageConnector]);
        const opcTolerances = tolerances[Category.OffPageConnector] || { vertical: 15, horizontal: 20 };
    
    try {
        // Find all Drawing Number matches (including already consumed ones for OPC purposes)
        const drawingNumberMatches = [];
        for (let i = 0; i < textItems.length; i++) {
            const item = textItems[i];
            const match = item.str.match(drawingNumberRegex);
            
            if (match) {
                const bbox = calculateBbox(item, viewBoxOffsetX, viewBoxOffsetY, viewport, rotation);
                drawingNumberMatches.push({
                    item,
                    index: i,
                    bbox,
                    text: match[0],
                    isConsumed: consumedIndices.has(i), // Track if this was already used as Drawing Number tag
                });
            }
        }
        
        
        // For each Drawing Number, look for nearby reference numbers
        for (const dwgMatch of drawingNumberMatches) {
            const dwgCenter = {
                x: (dwgMatch.bbox.x1 + dwgMatch.bbox.x2) / 2,
                y: (dwgMatch.bbox.y1 + dwgMatch.bbox.y2) / 2,
            };
            
            let bestReference = null;
            let minDistanceSq = Infinity;
            
            for (let i = 0; i < textItems.length; i++) {
                if (consumedIndices.has(i) || i === dwgMatch.index) continue;
                
                const item = textItems[i];
                const refMatch = item.str.match(opcReferenceRegex);
                
                if (refMatch) {
                    const bbox = calculateBbox(item, viewBoxOffsetX, viewBoxOffsetY, viewport, rotation);
                    const refCenter = {
                        x: (bbox.x1 + bbox.x2) / 2,
                        y: (bbox.y1 + bbox.y2) / 2,
                    };
                    
                    const dx = Math.abs(dwgCenter.x - refCenter.x);
                    const dy = Math.abs(dwgCenter.y - refCenter.y);
                    
                    if (dx <= opcTolerances.horizontal && dy <= opcTolerances.vertical) {
                        const distanceSq = dx * dx + dy * dy;
                        if (distanceSq < minDistanceSq) {
                            minDistanceSq = distanceSq;
                            bestReference = { item, index: i, bbox, text: refMatch[0] };
                        }
                    }
                }
            }
            
            if (bestReference) {
                // Create OPC tag using only the reference part (not the full drawing number)
                const cleanedText = removeWhitespace(bestReference.text, Category.OffPageConnector, appSettings.autoRemoveWhitespace);
                
                foundTags.push({
                    id: uuidv4(),
                    text: cleanedText,
                    page: pageNum,
                    bbox: bestReference.bbox,
                    category: Category.OffPageConnector,
                    sourceItems: [
                        {
                            id: uuidv4(),
                            text: dwgMatch.item.str,
                            page: pageNum,
                            bbox: dwgMatch.bbox,
                        },
                        {
                            id: uuidv4(),
                            text: bestReference.item.str,
                            page: pageNum,
                            bbox: bestReference.bbox,
                        }
                    ],
                });
                consumedIndices.add(bestReference.index);
                // Note: We don't consume the drawing number index as it might be the title block
            }
        }
    } catch (error) {
    }
    } // End of OPC Pass conditional block

    // Final Pass: Collect all un-tagged items as raw text
    for (let i = 0; i < textItems.length; i++) {
        if (consumedIndices.has(i)) continue;
        const item = textItems[i];
        const bbox = calculateBbox(item, viewBoxOffsetX, viewBoxOffsetY, viewport, rotation);
        
        
        rawTextItems.push({
            id: uuidv4(),
            text: item.str,
            page: pageNum,
            bbox: bbox,
         });
    }

    return { tags: foundTags, rawTextItems };
};

// Post-processing function to create OPC relationships across pages
export const createOPCRelationships = (tags, relationshipType) => {
    const opcTags = tags.filter(tag => tag.category === Category.OffPageConnector);
    const relationships = [];
    
    
    // Group OPC tags by their reference text
    const opcGroups = {};
    opcTags.forEach(tag => {
        const refText = tag.text;
        if (!opcGroups[refText]) {
            opcGroups[refText] = [];
        }
        opcGroups[refText].push(tag);
    });
    
    // Create relationships for groups that have exactly 2 tags on different pages
    Object.entries(opcGroups).forEach(([refText, tagGroup]) => {
        
        if (tagGroup.length === 2) {
            const [tag1, tag2] = tagGroup;
            
            // Only connect if they are on different pages
            if (tag1.page !== tag2.page) {
                
                // Create bidirectional relationship
                relationships.push({
                    id: uuidv4(),
                    from: tag1.id,
                    to: tag2.id,
                    type: relationshipType.OffPageConnection,
                });
                
                relationships.push({
                    id: uuidv4(),
                    from: tag2.id,
                    to: tag1.id,
                    type: relationshipType.OffPageConnection,
                });
            } else {
            }
        } else if (tagGroup.length > 2) {
        } else {
        }
    });
    
    return relationships;
};
