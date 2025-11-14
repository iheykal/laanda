const keyframes = [];
const steps = 86;

let count = 0;
let s = 'polygon(50% 50%, 50% 0%, 50% 0%';

for (let i = 50; i < 100; i += 5) {
    s += `, ${i}% 0%`;
    handle();
}
for (let i = 0; i < 100; i += 5) {
    s += `, 100% ${i}%`;
    handle();
}
for (let i = 100; i > 0; i -= 5) {
    s += `, ${i}% 100%`;
    handle();
}

for (let i = 100; i > 0; i -= 5) {
    s += `, 0% ${i}%`;
    handle();
}
for (let i = 0; i <= 50; i += 5) {
    s += `, ${i}% 0%`;
    handle();
}

function handle() {
    const percentage = (count / steps) * 100;
    let step;
    if (percentage <= 75 && percentage >= 73) {
        step = `${percentage}% {
            background-color: orange;
            clip-path: ${s}) 
        }`;
    } else if (percentage > 97.5 && percentage < 100) {
        step = `${percentage}% {
            background-color: red;
            clip-path: ${s}) 
        }`;
    } else if (percentage > 0 && percentage < 2.5) {
        step = `${percentage}% {
            background-color: green;
            clip-path: ${s}) 
        }`;
    } else {
        step = `${percentage}% {
            clip-path: ${s}) 
        }`;
    }
    keyframes.push(step);
    count++;
}
// Find an accessible stylesheet or create a new one
if (document) {
    let targetStyleSheet = null;
    
    // Try to find an accessible stylesheet
    for (let i = 0; i < document.styleSheets.length; i++) {
        try {
            // Try to access cssRules to check if it's accessible
            if (document.styleSheets[i].cssRules) {
                targetStyleSheet = document.styleSheets[i];
                break;
            }
        } catch (e) {
            // Skip external stylesheets that throw CORS errors
            continue;
        }
    }
    
    // If no accessible stylesheet found, create a new one
    if (!targetStyleSheet) {
        const style = document.createElement('style');
        document.head.appendChild(style);
        targetStyleSheet = style.sheet;
    }
    
    // Insert the animation rule
    if (targetStyleSheet) {
        try {
            targetStyleSheet.insertRule(
                `
  @keyframes timerAnimation {
    ${keyframes.join('\n')}
  }
`,
                targetStyleSheet.cssRules.length
            );
        } catch (e) {
            console.warn('Failed to insert timer animation rule:', e);
        }
    }
}
