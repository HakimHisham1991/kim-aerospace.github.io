document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const nInput = document.getElementById('n');
    const diameterInput = document.getElementById('diameter');
    const vcInput = document.getElementById('vc');
    const lInput = document.getElementById('l');
    const fInput = document.getElementById('f');
    
    // Radio buttons
    const calcVcRadio = document.getElementById('calc-vc');
    const calcNRadio = document.getElementById('calc-n');
    const calcDRadio = document.getElementById('calc-diameter');
    const calcFRadio = document.getElementById('calc-f');
    const calcLRadio = document.getElementById('calc-l');
    
    // Update input states
    function updateInputStates() {
        // Cutting Speed section
        vcInput.disabled = calcVcRadio.checked;
        nInput.disabled = calcNRadio.checked;
        diameterInput.disabled = calcDRadio.checked;
        
        // Feed Rate section
        fInput.disabled = calcFRadio.checked;
        lInput.disabled = calcLRadio.checked;
    }
    
    // Initialize and add event listeners
    function init() {
        updateInputStates();
        
        // Add change listeners to all radio buttons
        [calcVcRadio, calcNRadio, calcDRadio, calcFRadio, calcLRadio].forEach(radio => {
            radio.addEventListener('change', updateInputStates);
        });
        
        // Calculate button
        calculateBtn.addEventListener('click', calculate);
        
        // Enter key support
        [nInput, diameterInput, vcInput, lInput, fInput].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') calculate();
            });
        });
    }
    
    // Calculation function
    function calculate() {
        // Cutting Speed calculations
        if (calcVcRadio.checked) {
            const n = parseFloat(nInput.value);
            const D = parseFloat(diameterInput.value);
            if (isNaN(n) || isNaN(D) || n <= 0 || D <= 0) {
                alert('Please enter valid values for Spindle Speed and Diameter');
                return;
            }
            vcInput.value = ((3.14 * D * n) / 1000).toFixed(2);
        }
        else if (calcNRadio.checked) {
            const vc = parseFloat(vcInput.value);
            const D = parseFloat(diameterInput.value);
            if (isNaN(vc) || isNaN(D) || vc <= 0 || D <= 0) {
                alert('Please enter valid values for Cutting Speed and Diameter');
                return;
            }
            nInput.value = Math.round((vc * 1000) / (3.14 * D));
        }
        else if (calcDRadio.checked) {
            const vc = parseFloat(vcInput.value);
            const n = parseFloat(nInput.value);
            if (isNaN(vc) || isNaN(n) || vc <= 0 || n <= 0) {
                alert('Please enter valid values for Cutting Speed and Spindle Speed');
                return;
            }
            diameterInput.value = ((vc * 1000) / (3.14 * n)).toFixed(2);
        }
        
        // Feed Rate calculations
        if (calcFRadio.checked) {
            const l = parseFloat(lInput.value);
            const n = parseFloat(nInput.value);
            if (isNaN(l) || isNaN(n) || l <= 0 || n <= 0) {
                alert('Please enter valid values for Length of Cut and Spindle Speed');
                return;
            }
            fInput.value = (l / n).toFixed(6);
        }
        else if (calcLRadio.checked) {
            const f = parseFloat(fInput.value);
            const n = parseFloat(nInput.value);
            if (isNaN(f) || isNaN(n) || f <= 0 || n <= 0) {
                alert('Please enter valid values for Feed Rate and Spindle Speed');
                return;
            }
            lInput.value = (f * n).toFixed(3);
        }
    }
    
    // Initialize the calculator
    init();
});
