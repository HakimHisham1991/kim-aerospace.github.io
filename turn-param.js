document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const nInput = document.getElementById('n');
    const diameterInput = document.getElementById('diameter');
    const vcInput = document.getElementById('vc');
    const lInput = document.getElementById('l');
    const fInput = document.getElementById('f');
    const calcDRadio = document.getElementById('calc-diameter');
    const calcVcRadio = document.getElementById('calc-vc');
    const calcLRadio = document.getElementById('calc-l');
    const calcFRadio = document.getElementById('calc-f');
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculateAll);
    
    // Allow calculation on Enter key press
    [nInput, diameterInput, vcInput, lInput, fInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculateAll();
            }
        });
    });
    
    function calculateVc() {
        const n = parseFloat(nInput.value.replace(/,/g, ''));
        const diameter = parseFloat(diameterInput.value.replace(/,/g, ''));
        const vc = parseFloat(vcInput.value.replace(/,/g, ''));
        
        if (calcDRadio.checked) {
            // Calculate D (diameter)
            if (isNaN(n) || isNaN(vc) || n <= 0 || vc <= 0) {
                alert('Please enter valid positive numbers for Spindle Speed and Cutting Speed');
                return false;
            }
            const D = (vc * 1000) / (3.14 * n);
            diameterInput.value = D.toFixed(2);
            return true;
        } 
        else if (calcVcRadio.checked) {
            // Calculate vc (cutting speed)
            if (isNaN(diameter) || isNaN(n) || diameter <= 0 || n <= 0) {
                alert('Please enter valid positive numbers for Diameter and Spindle Speed');
                return false;
            }
            const calculatedVc = (3.14 * diameter * n) / 1000;
            vcInput.value = calculatedVc.toFixed(2);
            return true;
        }
    }
    
    function calculateF() {
        const n = parseFloat(nInput.value.replace(/,/g, ''));
        const l = parseFloat(lInput.value.replace(/,/g, ''));
        const f = parseFloat(fInput.value.replace(/,/g, ''));
        
        if (calcLRadio.checked) {
            // Calculate l (length of cut)
            if (isNaN(n) || isNaN(f) || n <= 0 || f <= 0) {
                alert('Please enter valid positive numbers for Spindle Speed and Feed Rate');
                return false;
            }
            const calculatedL = n * f;
            lInput.value = calculatedL.toFixed(3);
            return true;
        }
        else if (calcFRadio.checked) {
            // Calculate f (feed rate)
            if (isNaN(l) || isNaN(n) || l <= 0 || n <= 0) {
                alert('Please enter valid positive numbers for Length of Cut and Spindle Speed');
                return false;
            }
            const calculatedF = l / n;
            fInput.value = calculatedF.toFixed(6);
            return true;
        }
    }
    
    function calculateAll() {
        // First validate spindle speed is entered
        const n = parseFloat(nInput.value.replace(/,/g, ''));
        if (isNaN(n) || n <= 0) {
            alert('Please enter a valid positive number for Spindle Speed');
            return;
        }
        
        // Calculate both sections
        const vcSuccess = calculateVc();
        const fSuccess = calculateF();
        
        // If both calculations failed, show a general error
        if (!vcSuccess && !fSuccess) {
            alert('Please select at least one calculation to perform (Cutting Speed or Feed Rate)');
        }
    }
});