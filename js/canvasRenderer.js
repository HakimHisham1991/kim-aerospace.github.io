import { calculateArcCenter } from './gcodeParser.js';

export function clearCanvas() {
  const canvas = document.getElementById('toolpathCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawArrow(ctx, fromX, fromY, toX, toY, scale) {
  const headlen = 10; // Fixed pixel length for arrowhead
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return; // Avoid division by zero

  // Normalize direction vector
  const nx = dx / length;
  const ny = dy / length;

  // Calculate arrowhead points
  const endX = toX;
  const endY = toY;
  const arrow1X = endX - headlen * (nx * Math.cos(Math.PI / 6) - ny * Math.sin(Math.PI / 6));
  const arrow1Y = endY - headlen * (ny * Math.cos(Math.PI / 6) + nx * Math.sin(Math.PI / 6));
  const arrow2X = endX - headlen * (nx * Math.cos(Math.PI / 6) + ny * Math.sin(Math.PI / 6));
  const arrow2Y = endY - headlen * (ny * Math.cos(Math.PI / 6) - nx * Math.sin(Math.PI / 6));

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(endX, endY);
  ctx.moveTo(endX, endY);
  ctx.lineTo(arrow1X, arrow1Y);
  ctx.moveTo(endX, endY);
  ctx.lineTo(arrow2X, arrow2Y);
  ctx.stroke();
}

export function renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows) {
  const canvas = document.getElementById('toolpathCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('warningsDiv').textContent = '';

  if (paths.length === 0) {
    alert('No valid toolpath found in the G-code.');
    return;
  }

  const minPadding = 10;
  if (minX > -minPadding) minX = -minPadding;
  if (maxX < minPadding) maxX = minPadding;
  if (minY > -minPadding) minY = -minPadding;
  if (maxY < minPadding) maxY = minPadding;

  const tickInterval = 100;
  minX = Math.floor(minX / tickInterval) * tickInterval;
  maxX = Math.ceil(maxX / tickInterval) * tickInterval;
  minY = Math.floor(minY / tickInterval) * tickInterval;
  maxY = Math.ceil(maxY / tickInterval) * tickInterval;

  const padding = 50;
  const canvasWidth = canvas.width - 2 * padding;
  const canvasHeight = canvas.height - 2 * padding;
  const width = maxX - minX;
  const height = maxY - minY;

  const minDimension = 1;
  const effectiveWidth = width === 0 ? minDimension : width;
  const effectiveHeight = height === 0 ? minDimension : height;

  let scale = Math.min(canvasHeight / effectiveHeight, canvasWidth / effectiveWidth) * currentScale;
  const offsetX = padding - minX * scale;
  const offsetY = (canvas.height / 2) + ((-minY - (maxY - minY) / 2) * scale);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  const zeroY = canvas.height - (0 * scale + offsetY);
  ctx.beginPath();
  ctx.moveTo(padding, zeroY);
  ctx.lineTo(canvas.width - padding, zeroY);
  ctx.stroke();

  const zeroX = 0 * scale + offsetX;
  ctx.beginPath();
  ctx.moveTo(zeroX, padding);
  ctx.lineTo(zeroX, canvas.height - padding);
  ctx.stroke();

  ctx.font = '12px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('X', canvas.width - padding + 10, zeroY);
  ctx.fillText('Y', zeroX, padding - 10);

  const tickSize = 5;
  for (let x = minX; x <= maxX; x += tickInterval) {
    const canvasX = x * scale + offsetX;
    ctx.beginPath();
    ctx.moveTo(canvasX, zeroY - tickSize);
    ctx.lineTo(canvasX, zeroY + tickSize);
    ctx.stroke();
    ctx.fillText(x.toFixed(0), canvasX, zeroY + 20);
  }
  for (let y = minY; y <= maxY; y += tickInterval) {
    const canvasY = canvas.height - (y * scale + offsetY);
    ctx.beginPath();
    ctx.moveTo(zeroX - tickSize, canvasY);
    ctx.lineTo(zeroX + tickSize, canvasY);
    ctx.stroke();
    ctx.fillText(y.toFixed(0), zeroX - 20, canvasY + 4);
  }

  ctx.lineWidth = 2;
  paths.forEach(path => {
    ctx.beginPath();
    const startCanvasX = path.startX * scale + offsetX;
    const startCanvasY = canvas.height - (path.startY * scale + offsetY);
    const endCanvasX = path.endX * scale + offsetX;
    const endCanvasY = canvas.height - (path.endY * scale + offsetY);
    if (path.mode === 'G02' || path.mode === 'G03') {
      let centerX, centerY, radius, startAngle, endAngle;
      if (path.r !== null) {
        radius = Math.abs(path.r);
        if (radius < 0.001) {
          const warningDiv = document.getElementById('warningsDiv');
          warningDiv.textContent += `Invalid arc: Zero radius arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY}). Skipping.\n`;
          warningDiv.style.color = 'red';
          return;
        }
        const center = calculateArcCenter(path.startX, path.startY, path.endX, path.endY, path.r, path.mode);
        if (!center) return;
        centerX = center[0];
        centerY = center[1];
        startAngle = Math.atan2(-(path.startY - centerY), path.startX - centerX);
        endAngle = Math.atan2(-(path.endY - centerY), path.endX - centerX);
        startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
        endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);

        // Handle arc rendering for each case
        if (path.mode === 'G02' && path.r > 0) {
          // Case 1: G02, R > 0 (minor arc, clockwise)
          if (endAngle < startAngle) endAngle += 2 * Math.PI;
          ctx.arc(centerX * scale + offsetX, canvas.height - (centerY * scale + offsetY), radius * scale, startAngle, endAngle, false);
          ctx.strokeStyle = '#00ff00';
          ctx.stroke();
        } else if (path.mode === 'G02' && path.r < 0) {
          // Case 2: G02, R < 0 (major arc, clockwise)
          if (endAngle > startAngle) endAngle -= 2 * Math.PI;
          ctx.arc(centerX * scale + offsetX, canvas.height - (centerY * scale + offsetY), radius * scale, startAngle, endAngle, false);
          ctx.strokeStyle = '#00ff00';
          ctx.stroke();
        } else if (path.mode === 'G03' && path.r > 0) {
          // Case 3: G03, R > 0 (minor arc, counterclockwise)
          if (endAngle < startAngle) endAngle += 2 * Math.PI;
          ctx.arc(centerX * scale + offsetX, canvas.height - (centerY * scale + offsetY), radius * scale, startAngle, endAngle, true);
          ctx.strokeStyle = '#00ff00';
          ctx.stroke();
        } else if (path.mode === 'G03' && path.r < 0) {
          // Case 4: G03, R < 0 (major arc, counterclockwise)
          if (endAngle > startAngle) endAngle -= 2 * Math.PI;
          ctx.arc(centerX * scale + offsetX, canvas.height - (centerY * scale + offsetY), radius * scale, startAngle, endAngle, true);
          ctx.strokeStyle = '#00ff00';
          ctx.stroke();
        }

        // Handle arrow rendering for each case using the same arc logic
        if (showArrows) {
          const arrowSpacing = 0.5;
          let angleDiff, numArrows;
          if (path.mode === 'G02' && path.r > 0) {
            // Case 1: G02, R > 0 (minor arc, clockwise)
            angleDiff = endAngle - startAngle;
            if (angleDiff < 0) angleDiff += 2 * Math.PI;
            numArrows = Math.max(1, Math.floor(angleDiff / arrowSpacing));
            for (let i = 0; i < numArrows; i++) {
              const t = i / (numArrows - 1 || 1);
              const angle = startAngle + t * angleDiff;
              const arrowX = centerX + radius * Math.cos(angle);
              const arrowY = centerY - radius * Math.sin(angle);
              const radiusX = Math.cos(angle);
              const radiusY = -Math.sin(angle);
              let tangentX = radiusY;
              let tangentY = -radiusX;
              const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
              if (tangentLength > 0) {
                tangentX /= tangentLength;
                tangentY /= tangentLength;
              }
              const arrowLength = 10;
              const baseX = arrowX;
              const baseY = arrowY;
              const tipX = arrowX + tangentX * arrowLength / scale;
              const tipY = arrowY + tangentY * arrowLength / scale;
              ctx.strokeStyle = '#00ff00';
              drawArrow(ctx, baseX * scale + offsetX, canvas.height - (baseY * scale + offsetY), tipX * scale + offsetX, canvas.height - (tipY * scale + offsetY), scale);
            }
          } else if (path.mode === 'G02' && path.r < 0) {
            // Case 2: G02, R < 0 (major arc, clockwise)
            let adjustedEndAngle = endAngle;
            if (endAngle > startAngle) adjustedEndAngle -= 2 * Math.PI;
            angleDiff = adjustedEndAngle - startAngle;
            if (angleDiff < 0) angleDiff += 2 * Math.PI;
            numArrows = Math.max(1, Math.floor(angleDiff / arrowSpacing));
            for (let i = 0; i < numArrows; i++) {
              const t = i / (numArrows - 1 || 1);
              const angle = startAngle + t * angleDiff;
              const arrowX = centerX + radius * Math.cos(angle);
              const arrowY = centerY - radius * Math.sin(angle);
              const radiusX = Math.cos(angle);
              const radiusY = -Math.sin(angle);
              let tangentX = radiusY;
              let tangentY = -radiusX;
              const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
              if (tangentLength > 0) {
                tangentX /= tangentLength;
                tangentY /= tangentLength;
              }
              const arrowLength = 10;
              const baseX = arrowX;
              const baseY = arrowY;
              const tipX = arrowX + tangentX * arrowLength / scale;
              const tipY = arrowY + tangentY * arrowLength / scale;
              ctx.strokeStyle = '#00ff00';
              drawArrow(ctx, baseX * scale + offsetX, canvas.height - (baseY * scale + offsetY), tipX * scale + offsetX, canvas.height - (tipY * scale + offsetY), scale);
            }
          } else if (path.mode === 'G03' && path.r > 0) {
            // Case 3: G03, R > 0 (minor arc, counterclockwise)
            let adjustedEndAngle = endAngle;
            if (endAngle < startAngle) {
              const rawDiff = endAngle - startAngle;
              if (rawDiff < -Math.PI) adjustedEndAngle += 2 * Math.PI;
            }
            angleDiff = adjustedEndAngle - startAngle;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI; // Ensure minor arc
            if (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI; // Ensure minor arc
            numArrows = Math.max(1, Math.floor(Math.abs(angleDiff) / arrowSpacing));
            for (let i = 0; i < numArrows; i++) {
              const t = i / (numArrows - 1 || 1);
              const angle = startAngle + t * angleDiff;
              const arrowX = centerX + radius * Math.cos(angle);
              const arrowY = centerY - radius * Math.sin(angle);
              const radiusX = Math.cos(angle);
              const radiusY = -Math.sin(angle);
              let tangentX = -radiusY;
              let tangentY = radiusX;
              const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
              if (tangentLength > 0) {
                tangentX /= tangentLength;
                tangentY /= tangentLength;
              }
              const arrowLength = 10;
              const baseX = arrowX;
              const baseY = arrowY;
              const tipX = arrowX + tangentX * arrowLength / scale;
              const tipY = arrowY + tangentY * arrowLength / scale;
              ctx.strokeStyle = '#00ff00';
              drawArrow(ctx, baseX * scale + offsetX, canvas.height - (baseY * scale + offsetY), tipX * scale + offsetX, canvas.height - (tipY * scale + offsetY), scale);
            }
          } else if (path.mode === 'G03' && path.r < 0) {
            // Case 4: G03, R < 0 (major arc, counterclockwise)
            let adjustedEndAngle = endAngle;
            const rawDiff = endAngle - startAngle;
            if (Math.abs(rawDiff) <= Math.PI) {
              adjustedEndAngle = startAngle + (rawDiff > 0 ? rawDiff - 2 * Math.PI : rawDiff + 2 * Math.PI);
            }
            angleDiff = adjustedEndAngle - startAngle;
            numArrows = Math.max(1, Math.floor(Math.abs(angleDiff) / arrowSpacing));
            for (let i = 0; i < numArrows; i++) {
              const t = i / (numArrows - 1 || 1);
              const angle = startAngle + t * angleDiff;
              const arrowX = centerX + radius * Math.cos(angle);
              const arrowY = centerY - radius * Math.sin(angle);
              const radiusX = Math.cos(angle);
              const radiusY = -Math.sin(angle);
              let tangentX = -radiusY;
              let tangentY = radiusX;
              const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
              if (tangentLength > 0) {
                tangentX /= tangentLength;
                tangentY /= tangentLength;
              }
              const arrowLength = 10;
              const baseX = arrowX;
              const baseY = arrowY;
              const tipX = arrowX + tangentX * arrowLength / scale;
              const tipY = arrowY + tangentY * arrowLength / scale;
              ctx.strokeStyle = '#00ff00';
              drawArrow(ctx, baseX * scale + offsetX, canvas.height - (baseY * scale + offsetY), tipX * scale + offsetX, canvas.height - (tipY * scale + offsetY), scale);
            }
          }
        }
      } else {
        centerX = path.startX + path.i;
        centerY = path.startY + path.j;
        radius = Math.sqrt(path.i * path.i + path.j * path.j);
        if (radius < 0.001) {
          const warningDiv = document.getElementById('warningsDiv');
          warningDiv.textContent += `Invalid arc: Zero radius arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY}). Skipping.\n`;
          warningDiv.style.color = 'red';
          return;
        }
        const startDistance = Math.sqrt(
          Math.pow(path.startX - centerX, 2) + Math.pow(path.startY - centerY, 2)
        );
        const endDistance = Math.sqrt(
          Math.pow(path.endX - centerX, 2) + Math.pow(path.endY - centerY, 2)
        );
        if (Math.abs(startDistance - endDistance) > 0.1) {
          const warningDiv = document.getElementById('warningsDiv');
          warningDiv.textContent += `Invalid arc: Start and end points not equidistant from center. Start distance: ${startDistance.toFixed(3)}, End distance: ${endDistance.toFixed(3)}. Skipping arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY})\n`;
          warningDiv.style.color = 'red';
          return;
        }
        startAngle = Math.atan2(-(path.startY - centerY), path.startX - centerX);
        endAngle = Math.atan2(-(path.endY - centerY), path.endX - centerX);
        startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
        endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);
        if (path.mode === 'G02') {
          if (endAngle <= startAngle) endAngle += 2 * Math.PI;
        } else {
          if (endAngle >= startAngle) endAngle -= 2 * Math.PI;
        }
        ctx.arc(centerX * scale + offsetX, canvas.height - (centerY * scale + offsetY), radius * scale, startAngle, endAngle, path.mode === 'G03');
        ctx.strokeStyle = '#00ff00';
        ctx.stroke();
        if (showArrows) {
          const arrowSpacing = 0.5;
          const angleDiff = path.mode === 'G03' ? startAngle - endAngle : endAngle - startAngle;
          const numArrows = Math.max(1, Math.floor(Math.abs(angleDiff) / arrowSpacing));
          for (let i = 0; i < numArrows; i++) {
            const t = i / (numArrows - 1 || 1); // Prevent division by zero
            const angle = path.mode === 'G03' 
              ? startAngle - t * (startAngle - endAngle)
              : startAngle + t * (endAngle - startAngle);
            const arrowX = centerX + radius * Math.cos(angle);
            const arrowY = centerY - radius * Math.sin(angle);
            const radiusX = Math.cos(angle);
            const radiusY = -Math.sin(angle);
            let tangentX, tangentY;
            if (path.mode === 'G02') {
              tangentX = radiusY;
              tangentY = -radiusX;
            } else {
              tangentX = -radiusY;
              tangentY = radiusX;
            }
            const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
            if (tangentLength > 0) {
              tangentX /= tangentLength;
              tangentY /= tangentLength;
            }
            const arrowLength = 10; // Fixed pixel length for arrowhead
            const baseX = arrowX;
            const baseY = arrowY;
            const tipX = arrowX + tangentX * arrowLength / scale;
            const tipY = arrowY + tangentY * arrowLength / scale;
            ctx.strokeStyle = '#00ff00';
            drawArrow(ctx, baseX * scale + offsetX, canvas.height - (baseY * scale + offsetY), tipX * scale + offsetX, canvas.height - (tipY * scale + offsetY), scale);
          }
        }
      }
    } else {
      ctx.moveTo(startCanvasX, startCanvasY);
      ctx.lineTo(endCanvasX, endCanvasY);
      if (path.mode === 'G00') {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#ff0000';
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = '#0000ff';
      }
      ctx.stroke();
      if (showArrows && path.mode !== 'G02' && path.mode !== 'G03') {
        const arrowSpacing = 50 * scale;
        const length = Math.sqrt(Math.pow(endCanvasX - startCanvasX, 2) + Math.pow(endCanvasY - startCanvasY, 2));
        const numArrows = Math.max(1, Math.floor(length / arrowSpacing));
        for (let i = 1; i <= numArrows; i++) {
          const t = i / (numArrows + 1);
          const arrowX = startCanvasX + t * (endCanvasX - startCanvasX);
          const arrowY = startCanvasY + t * (endCanvasY - startCanvasY);
          const dx = (endCanvasX - startCanvasX) / length;
          const dy = (endCanvasY - startCanvasY) / length;
          drawArrow(ctx, 
            arrowX, 
            arrowY, 
            arrowX + dx * 10, 
            arrowY + dy * 10, 
            scale
          );
        }
      }
    }
  });
}