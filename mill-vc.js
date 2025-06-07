document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const diameterInput = document.getElementById('diameter');
    const speedInput = document.getElementById('speed');
    const vcInput = document.getElementById('vc');
    const calcNRadio = document.getElementById('calc-n');
    const calcDRadio = document.getElementById('calc-diameter');
    const calcVcRadio = document.getElementById('calc-vc');
    
    // Function to update input states
    function updateInputStates() {
        if (calcNRadio.checked) {
            // Calculating n (spindle speed) - disable n input
            speedInput.disabled = true;  // Changed from false to true
            diameterInput.disabled = false;
            vcInput.disabled = false;   // Changed from true to false
        } 
        else if (calcDRadio.checked) {
            // Calculating D (diameter) - disable D input
            speedInput.disabled = false;
            diameterInput.disabled = true;
            vcInput.disabled = false;
        } 
        else if (calcVcRadio.checked) {
            // Calculating vc (cutting speed) - disable vc input
            speedInput.disabled = false;
            diameterInput.disabled = false;
            vcInput.disabled = true;
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculate);
    
    // Update input states when radio selection changes
    calcNRadio.addEventListener('change', updateInputStates);
    calcDRadio.addEventListener('change', updateInputStates);
    calcVcRadio.addEventListener('change', updateInputStates);
    
    // Initialize input states
    updateInputStates();
    
    // Allow calculation on Enter key press
    [diameterInput, speedInput, vcInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
    
    function calculate() {
        // Get and sanitize input values
        const diameter = parseFloat(diameterInput.value.replace(/,/g, ''));
        const speed = parseFloat(speedInput.value.replace(/,/g, ''));
        const vc = parseFloat(vcInput.value.replace(/,/g, ''));
        
        // Calculate based on selected radio
        if (calcNRadio.checked) {
            // Calculate n (spindle speed)
            if (isNaN(diameter) || isNaN(vc) || diameter <= 0 || vc <= 0) {
                alert('Please enter valid positive numbers for Diameter and Cutting Speed');
                return;
            }
            const n = (vc * 1000) / (3.14 * diameter);
            speedInput.value = Math.round(n);
        } 
        else if (calcDRadio.checked) {
            // Calculate D (diameter)
            if (isNaN(speed) || isNaN(vc) || speed <= 0 || vc <= 0) {
                alert('Please enter valid positive numbers for Speed and Cutting Speed');
                return;
            }
            const D = (vc * 1000) / 3.14 * speed);
            diameterInput.value = D.toFixed(2);
        } 
        else if (calcVcRadio.checked) {
            // Calculate vc (cutting speed)
            if (isNaN(diameter) || isNaN(speed) || diameter <= 0 || speed <= 0) {
                alert('Please enter valid positive numbers for Diameter and Speed');
                return;
            }
            const calculatedVc = (3.14 * diameter * speed) / 1000;
            vcInput.value = calculatedVc.toFixed(2);
        }
    }
});
