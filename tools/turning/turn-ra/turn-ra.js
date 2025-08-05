document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const hInput = document.getElementById('h');
    const fInput = document.getElementById('f');
    const reInput = document.getElementById('re');
    const calcHRadio = document.getElementById('calc-h');
    const calcFRadio = document.getElementById('calc-f');
    const calcReRadio = document.getElementById('calc-re');
    
    // Function to update input states
    function updateInputStates() {
        if (calcHRadio.checked) {
            // Calculating h - disable h input
            hInput.disabled = true;
            fInput.disabled = false;
            reInput.disabled = false;
        } 
        else if (calcFRadio.checked) {
            // Calculating f - disable f input
            hInput.disabled = false;
            fInput.disabled = true;
            reInput.disabled = false;
        }
        else if (calcReRadio.checked) {
            // Calculating Re - disable Re input
            hInput.disabled = false;
            fInput.disabled = false;
            reInput.disabled = true;
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculate);
    
    // Update input states when radio selection changes
    calcHRadio.addEventListener('change', updateInputStates);
    calcFRadio.addEventListener('change', updateInputStates);
    calcReRadio.addEventListener('change', updateInputStates);
    
    // Initialize input states
    updateInputStates();
    
    // Allow calculation on Enter key press
    [hInput, fInput, reInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
    
    function calculate() {
        // Get and sanitize input values
        const h = parseFloat(hInput.value.replace(/,/g, ''));
        const f = parseFloat(fInput.value.replace(/,/g, ''));
        const re = parseFloat(reInput.value.replace(/,/g, ''));
        
        // Calculate based on selected radio
        if (calcHRadio.checked) {
            // Calculate h (surface roughness)
            if (isNaN(f) || isNaN(re) || f <= 0 || re <= 0) {
                alert('Please enter valid positive numbers for Feed per Revolution and Insert Corner Radius');
                return;
            }
            const calculatedH = (Math.pow(f, 2) / (8 * re)) * 1000;
            hInput.value = calculatedH.toFixed(3);
        } 
        else if (calcFRadio.checked) {
            // Calculate f (feed per revolution)
            if (isNaN(h) || isNaN(re) || h <= 0 || re <= 0) {
                alert('Please enter valid positive numbers for Surface Roughness and Insert Corner Radius');
                return;
            }
            const calculatedF = Math.sqrt((h * 8 * re) / 1000);
            fInput.value = calculatedF.toFixed(6);
        }
        else if (calcReRadio.checked) {
            // Calculate Re (insert corner radius)
            if (isNaN(h) || isNaN(f) || h <= 0 || f <= 0) {
                alert('Please enter valid positive numbers for Surface Roughness and Feed per Revolution');
                return;
            }
            const calculatedRe = (Math.pow(f, 2) * 1000) / (8 * h);
            reInput.value = calculatedRe.toFixed(3);
        }
    }
});