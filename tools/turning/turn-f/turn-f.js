document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const lInput = document.getElementById('l');
    const nInput = document.getElementById('n');
    const fInput = document.getElementById('f');
    const calcLRadio = document.getElementById('calc-l');
    const calcNRadio = document.getElementById('calc-n');
    const calcFRadio = document.getElementById('calc-f');
    
    // Function to update input states
    function updateInputStates() {
        if (calcLRadio.checked) {
            // Calculating l - disable l input
            lInput.disabled = true;
            nInput.disabled = false;
            fInput.disabled = false;
        } 
        else if (calcNRadio.checked) {
            // Calculating n - disable n input
            lInput.disabled = false;
            nInput.disabled = true;
            fInput.disabled = false;
        }
        else if (calcFRadio.checked) {
            // Calculating f - disable f input
            lInput.disabled = false;
            nInput.disabled = false;
            fInput.disabled = true;
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculate);
    
    // Update input states when radio selection changes
    calcLRadio.addEventListener('change', updateInputStates);
    calcNRadio.addEventListener('change', updateInputStates);
    calcFRadio.addEventListener('change', updateInputStates);
    
    // Initialize input states
    updateInputStates();
    
    // Allow calculation on Enter key press
    [lInput, nInput, fInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
    
    function calculate() {
        // Get and sanitize input values
        const l = parseFloat(lInput.value.replace(/,/g, ''));
        const n = parseFloat(nInput.value.replace(/,/g, ''));
        const f = parseFloat(fInput.value.replace(/,/g, ''));
        
        // Calculate based on selected radio
        if (calcLRadio.checked) {
            // Calculate l (length of cut)
            if (isNaN(n) || isNaN(f) || n <= 0 || f <= 0) {
                alert('Please enter valid positive numbers for Spindle Revolutions and Feed Rate');
                return;
            }
            const calculatedL = n * f;
            lInput.value = calculatedL.toFixed(3);
        } 
        else if (calcNRadio.checked) {
            // Calculate n (spindle revolutions)
            if (isNaN(l) || isNaN(f) || l <= 0 || f <= 0) {
                alert('Please enter valid positive numbers for Length of Cut and Feed Rate');
                return;
            }
            const calculatedN = l / f;
            nInput.value = Math.round(calculatedN);
        }
        else if (calcFRadio.checked) {
            // Calculate f (feed rate)
            if (isNaN(l) || isNaN(n) || l <= 0 || n <= 0) {
                alert('Please enter valid positive numbers for Length of Cut and Spindle Revolutions');
                return;
            }
            const calculatedF = l / n;
            fInput.value = calculatedF.toFixed(6);
        }
    }
});